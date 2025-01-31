import { MessagesServiceConfig } from "@/app/config";
import { CodeError, Message } from "@/message";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as t from "io-ts";
import Bottleneck from "bottleneck";
import fetchRetry from "fetch-retry";

export const sendMessageApi: ({
  config,
  limiter,
}: {
  config: Pick<MessagesServiceConfig, "apiKey" | "baseURL">;
  limiter: Bottleneck;
}) => Message["sendMessage"] =
  ({ config, limiter }) =>
  (content) =>
  (fiscalCode) => {
    return pipe(
      TE.tryCatch(
        async () => {
          const response = await limiter.schedule(() =>
            fetchRetry(fetch)(new URL("/api/v1/messages", config.baseURL), {
              body: JSON.stringify({
                content,
                fiscal_code: fiscalCode,
              }),
              headers: {
                "Content-Type": "application/json",
                "Ocp-Apim-Subscription-Key": config.apiKey,
              },
              method: "POST",
              // this will execute three retries with exponential backoff if 429 is returned
              retryDelay: (attempt: number) => Math.pow(2, attempt) * 1000,
              retryOn: [429],
              // signal: AbortSignal.timeout(10000),
            }),
          );
          if (response.status !== 201) {
            throw new CodeError(response.status);
          }
          if (!response.ok) {
            throw new CodeError(500);
          }
          return response.json();
        },
        (error) => (error instanceof CodeError ? error : new CodeError(500)),
      ),
      TE.chainW(
        flow(
          t.type({
            id: t.string,
          }).decode,
          E.mapLeft(() => new CodeError(500)),
          TE.fromEither,
        ),
      ),
      TE.map(({ id }) => id),
    );
  };
