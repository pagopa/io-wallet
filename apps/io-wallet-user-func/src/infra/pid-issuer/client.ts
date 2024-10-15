import { Config, PidIssuerApiClientConfig } from "@/app/config";
import { CredentialRepository } from "@/credential";
import { removeTrailingSlash } from "@/url";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { Agent, RequestInit, fetch } from "undici";

import { PidIssuerHealthCheck } from "./health-check";

export class PidIssuerClient
  implements CredentialRepository, PidIssuerHealthCheck
{
  #baseURL: string;
  #healthCheckEnabled: boolean;
  #init: RequestInit;
  #requestTimeout: number;
  #walletProviderEntity: string;

  healthCheck = () =>
    this.#healthCheckEnabled
      ? TE.tryCatch(
          async () => {
            const result = await fetch(new URL(`/revokeAll`, this.#baseURL), {
              body: JSON.stringify({
                unique_id: "foo",
                wallet_provider: this.#walletProviderEntity,
              }),
              method: "POST",
              signal: AbortSignal.timeout(this.#requestTimeout),
              ...this.#init,
            });
            return result.status === 404;
          },
          (error) =>
            new Error(
              `Error occurred while checking PID issuer health: ${error}`,
            ),
        )
      : TE.of(true);

  revokeAllCredentials = (fiscalCode: FiscalCode) =>
    pipe(
      TE.tryCatch(
        async () => {
          const result = await fetch(new URL("/revokeAll", this.#baseURL), {
            body: JSON.stringify({
              // TINIT is the CF international format: TIN (Tax Identification Number) and IT (Italy). It is required by the endpoint
              unique_id: `TINIT-${fiscalCode}`,
              wallet_provider: this.#walletProviderEntity,
            }),
            method: "POST",
            signal: AbortSignal.timeout(this.#requestTimeout),
            ...this.#init,
          });

          if (result.status === 404) {
            // the endpoint returns 404 if the credentials have already been revoked or do not exist
            // the credentials already revoked => the error is suppressed because our endpoint is idempotent
            // the credentials do not exist => the error is suppressed because our endpoint returns 204 when attempting to revoke non-existent credentials
            // TODO: SIW-1402 add log
            return undefined;
          }
          if (!result.ok) {
            throw new Error(JSON.stringify(await result.json()));
          }
        },
        (error) =>
          error instanceof Error && error.name === "TimeoutError"
            ? new ServiceUnavailableError(
                `The request to the PID issuer has timed out: ${error.message}`,
              )
            : new Error(
                `Error occurred while making a request to the PID issuer: ${error}`,
              ),
      ),
    );

  constructor(
    {
      baseURL,
      clientCertificate,
      clientPrivateKey,
      healthCheckEnabled,
      requestTimeout,
      rootCACertificate,
    }: PidIssuerApiClientConfig,
    basePath: Config["federationEntity"]["basePath"]["href"],
  ) {
    this.#baseURL = baseURL;
    this.#walletProviderEntity = removeTrailingSlash(basePath);
    this.#healthCheckEnabled = healthCheckEnabled;
    this.#init = {
      dispatcher: new Agent({
        connect: {
          ca: rootCACertificate,
          cert: clientCertificate,
          key: clientPrivateKey,
          rejectUnauthorized: true,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    this.#requestTimeout = requestTimeout;
  }
}
