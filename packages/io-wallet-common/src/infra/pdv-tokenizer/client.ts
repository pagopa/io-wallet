import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import * as CircuitBreaker from "opossum";

import { ServiceUnavailableError } from "../../error";
import { UserRepository } from "../../user";
import { PdvTokenizerApiClientConfig } from "./config";
import { PdvTokenizerHealthCheck } from "./health-check";

const Token = t.type({
  token: NonEmptyString,
});

export class PdvTokenizerClient
  implements UserRepository, PdvTokenizerHealthCheck
{
  #baseURL: string;
  #circuitBreaker: CircuitBreaker<[fiscalCode: FiscalCode], unknown>;
  #options: RequestInit;
  #requestTimeout: number;
  #testUUID: string;

  private createCircuitBreaker: (
    errorThresholdPercentage: number,
    resetTimeout: number,
  ) => CircuitBreaker<[FiscalCode], unknown> = (
    errorThresholdPercentage,
    resetTimeout,
  ) =>
    new CircuitBreaker(this.fetchTokenByFiscalCode, {
      errorThresholdPercentage,
      resetTimeout,
    });

  // The method is used by the Circuit Breaker to limit calls in case of repeated errors or service interruptions
  private fetchTokenByFiscalCode = async (fiscalCode: FiscalCode) => {
    const result = await fetch(new URL("/tokenizer/v1/tokens", this.#baseURL), {
      body: JSON.stringify({ pii: fiscalCode }),
      headers: {
        ...this.#options.headers,
        "Content-Type": "application/json",
      },
      method: "PUT",
      signal: AbortSignal.timeout(this.#requestTimeout),
    });

    if (!result.ok) {
      throw new Error(JSON.stringify(await result.json()));
    }

    return result.json();
  };

  getOrCreateUserByFiscalCode = (fiscalCode: FiscalCode) =>
    pipe(
      TE.tryCatch(
        async () => this.#circuitBreaker.fire(fiscalCode),
        (error) =>
          error instanceof Error &&
          (error.name === "TimeoutError" || error.message === "Breaker is open")
            ? new ServiceUnavailableError(error.message)
            : new Error(`error getting user id by fiscal code: ${error}`),
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
          const result = await fetch(
            new URL(
              `/tokenizer/v1/tokens/${this.#testUUID}/pii`,
              this.#baseURL,
            ),
            {
              ...this.#options,
              method: "GET",
              signal: AbortSignal.timeout(this.#requestTimeout),
            },
          );
          return result.status === 200;
        },
        (error) => new Error(`error checking pdv tokenizer health: ${error}`),
      ),
    );

  constructor({
    apiKey,
    baseURL,
    circuitBreakerErrorThreshold,
    circuitBreakerResetTimeout,
    requestTimeout,
    testUUID,
  }: PdvTokenizerApiClientConfig) {
    this.#baseURL = baseURL;
    this.#options = {
      headers: {
        Accept: "application/json, text/plain",
        "x-api-key": apiKey,
      },
    };
    this.#requestTimeout = requestTimeout;
    this.#testUUID = testUUID;
    this.#circuitBreaker = this.createCircuitBreaker(
      circuitBreakerErrorThreshold,
      circuitBreakerResetTimeout,
    );
  }
}
