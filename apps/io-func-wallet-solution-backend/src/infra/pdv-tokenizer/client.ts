import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as t from "io-ts";
import { v4 as uuidv4 } from "uuid";
import { PdvTokenizerHealthCheck } from "./health-check";
import { UserIdRepository } from "@/user";
import { PdvTokenizerApiClientConfig } from "@/app/config";

const Token = t.type({
  token: NonEmptyString,
});

const Pii = t.type({
  pii: FiscalCode,
});

export class PdvTokenizerClient
  implements UserIdRepository, PdvTokenizerHealthCheck
{
  #baseURL: string;
  #options: RequestInit;

  constructor({ baseURL, apiKey }: PdvTokenizerApiClientConfig) {
    this.#baseURL = baseURL;
    this.#options = {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json, text/plain",
        "Content-Type": "application/json",
      },
    };
  }

  getUserIdByFiscalCode = (fiscalCode: FiscalCode) =>
    pipe(
      TE.tryCatch(
        async () => {
          const result = await fetch(
            new URL("/tokenizer/v1/tokens/search", this.#baseURL),
            {
              ...this.#options,
              signal: AbortSignal.timeout(3000),
              method: "POST",
              body: JSON.stringify({
                pii: fiscalCode,
              }),
            }
          );
          if (!result.ok) {
            throw new Error(JSON.stringify(await result.json()));
          }
          return result.json();
        },
        (error) => new Error(`error getting user id by fiscal code: ${error}`)
      ),
      TE.chain(
        flow(
          Token.decode,
          E.mapLeft(
            () =>
              new Error(
                "error getting user id by fiscal code: invalid result format from pdv"
              )
          ),
          TE.fromEither
        )
      ),
      TE.map(({ token }) => ({ id: token }))
    );

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
        (error) => new Error(`error getting fiscal code by user id: ${error}`)
      ),
      TE.chain(
        flow(
          Pii.decode,
          E.mapLeft(
            () =>
              new Error(
                "error getting fiscal code id by user id: invalid result format from pdv"
              )
          ),
          TE.fromEither
        )
      ),
      TE.map(({ pii }) => ({
        fiscalCode: pii,
      }))
    );

  healthCheck = () =>
    pipe(
      TE.tryCatch(
        async () => {
          const uuid = uuidv4();
          const result = await this.getFiscalCode(uuid);
          return result.status === 200 || result.status === 404;
        },
        (error) => new Error(`error checking pdv tokenizer health: ${error}`)
      )
    );

  private async getFiscalCode(id: string) {
    return fetch(new URL(`/tokenizer/v1/tokens/${id}/pii`, this.#baseURL), {
      ...this.#options,
      signal: AbortSignal.timeout(3000),
      method: "GET",
    });
  }
}
