import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as jose from "jose";

import { sendTelemetryException } from "@/infra/telemetry";
import {
  listPublishableStatusListIds,
  StatusListPublication,
} from "@/status-list";
import { buildUrl } from "@/url";

interface StatusListPublicationMonitorConfig {
  baseUrl: string;
}

interface StatusListPublicationMonitorEnvironment {
  statusListPublication: StatusListPublication;
  statusListPublicationMonitorConfig: StatusListPublicationMonitorConfig;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const maxTokenValiditySeconds = 12 * 60 * 60;

const hasValidExpiration = (exp: number | undefined) => {
  if (typeof exp !== "number") {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const remainingValiditySeconds = exp - now;

  return remainingValiditySeconds >= maxTokenValiditySeconds;
};

const validateTokenStatusListJwt = (
  jwt: string,
): TE.TaskEither<Error, boolean> =>
  pipe(
    E.tryCatch(() => jose.decodeJwt(jwt), toError),
    E.map((payload) => hasValidExpiration(payload.exp)),
    E.orElseW(() => E.right(false)),
    TE.fromEither,
  );

const isTokenStatusListValid =
  (
    statusListId: NonEmptyString,
  ): RTE.ReaderTaskEither<StatusListPublicationMonitorConfig, never, boolean> =>
  ({ baseUrl }) =>
    pipe(
      buildUrl(statusListId, baseUrl),
      TE.right,
      TE.chainW((statusListUrl) =>
        pipe(
          TE.tryCatch(
            () =>
              fetch(statusListUrl, {
                signal: AbortSignal.timeout(5000),
              }),
            toError,
          ),
          TE.chainW((response) =>
            response.ok
              ? TE.right(response)
              : TE.left(
                  new Error(
                    `Failed to fetch status list ${statusListUrl} from CDN: HTTP ${response.status}`,
                  ),
                ),
          ),
          TE.chainW((response) => TE.tryCatch(() => response.text(), toError)),
          TE.chainW(validateTokenStatusListJwt),
        ),
      ),
      TE.orElseW(() => TE.right(false)),
    );

const monitorStatusList = (
  statusListId: NonEmptyString,
): RTE.ReaderTaskEither<StatusListPublicationMonitorConfig, never, void> =>
  pipe(
    statusListId,
    isTokenStatusListValid,
    RTE.chain((result) =>
      result
        ? RTE.right(undefined)
        : pipe(
            new Error(`${statusListId} needs to be updated`),
            sendTelemetryException({
              functionName: "statusListPublicationMonitor",
            }),
            E.orElseW(() => E.right(undefined)),
            RTE.fromEither,
          ),
    ),
  );

const monitorStatusLists: RTE.ReaderTaskEither<
  StatusListPublicationMonitorEnvironment,
  Error,
  void
> = ({ statusListPublication, statusListPublicationMonitorConfig }) =>
  pipe(
    { statusListPublication },
    listPublishableStatusListIds,
    TE.chainW(
      TE.traverseSeqArray((statusListId) =>
        pipe(
          statusListPublicationMonitorConfig,
          monitorStatusList(statusListId),
        ),
      ),
    ),
    TE.map(() => undefined),
  );

export const StatusListPublicationMonitorHandler = H.of(() =>
  pipe(
    monitorStatusLists,
    RTE.orElseFirstW(
      flow(
        sendTelemetryException({
          functionName: "statusListPublicationMonitor",
        }),
        E.orElseW(() => E.right(undefined)),
        RTE.fromEither,
      ),
    ),
  ),
);
