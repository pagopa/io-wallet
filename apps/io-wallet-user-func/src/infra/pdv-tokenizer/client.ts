import { PdvTokenizerApiClientConfig } from "@/app/config";
import { UserRepository } from "@/user";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { PdvTokenizerHealthCheck } from "./health-check";

const Token = t.type({
  token: NonEmptyString,
});

const Pii = t.type({
  pii: FiscalCode,
});

export class PdvTokenizerClient
  implements UserRepository, PdvTokenizerHealthCheck
{
  #baseURL: string;
  #options: RequestInit;
  #testUUID: string;

  getFiscalCodeByUserId = (id: string) =>
    pipe(
      TE.tryCatch(
        async () => {
          const result = await this.getFiscalCode(id);
          if (!result.ok) {
            throw new Error(JSON.stringify(await result.json()));
          }
          return result.json();
        },
        (error) => new Error(`error getting fiscal code by user id: ${error}`),
      ),
      TE.chain(
        flow(
          Pii.decode,
          E.mapLeft(
            () =>
              new Error(
                "error getting fiscal code id by user id: invalid result format from pdv",
              ),
          ),
          TE.fromEither,
        ),
      ),
      TE.map(({ pii }) => ({
        fiscalCode: pii,
      })),
    );

  getOrCreateUserByFiscalCode = (fiscalCode: FiscalCode) =>
    pipe(
      TE.tryCatch(
        async () => {
          const headers = {
            ...this.#options.headers,
            "Content-Type": "application/json",
          };
          const result = await fetch(
            new URL("/tokenizer/v1/tokens", this.#baseURL),
            {
              body: JSON.stringify({
                pii: fiscalCode,
              }),
              headers,
              method: "PUT",
              signal: AbortSignal.timeout(3000),
            },
          );
          if (!result.ok) {
            throw new Error(JSON.stringify(await result.json()));
          }
          return result.json();
        },
        (error) => new Error(`error getting user id by fiscal code: ${error}`),
      ),
      TE.chain(
        flow(
          Token.decode,
          E.mapLeft(
            () =>
              new Error(
                "error getting user id by fiscal code: invalid result format from pdv",
              ),
          ),
          TE.fromEither,
        ),
      ),
      TE.map(({ token }) => ({ id: token })),
    );

  healthCheck = () =>
    pipe(
      TE.tryCatch(
        async () => {
          const result = await this.getFiscalCode(this.#testUUID);
          return result.status === 200;
        },
        (error) => new Error(`error checking pdv tokenizer health: ${error}`),
      ),
    );

  constructor({ apiKey, baseURL, testUUID }: PdvTokenizerApiClientConfig) {
    this.#baseURL = baseURL;
    this.#options = {
      headers: {
        Accept: "application/json, text/plain",
        "x-api-key": apiKey,
      },
    };
    this.#testUUID = testUUID;
  }

  private async getFiscalCode(id: string) {
    return fetch(new URL(`/tokenizer/v1/tokens/${id}/pii`, this.#baseURL), {
      ...this.#options,
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
  }
}
