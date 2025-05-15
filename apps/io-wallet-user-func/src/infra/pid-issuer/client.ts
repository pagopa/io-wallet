import { Config, PidIssuerApiClientConfig } from "@/app/config";
import { CredentialRepository } from "@/credential";
import { removeTrailingSlash } from "@/url";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";
import { Agent, RequestInit, fetch } from "undici";

import { PidIssuerHealthCheck } from "./health-check";

export class PidIssuerClient
  implements CredentialRepository, PidIssuerHealthCheck
{
  #baseURL: string;
  #clientCertificate: string;
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
              headers: {
                ...this.#init.headers,
                Authorization: `Bearer ${this.#clientCertificate}`,
              },
            });
            return result.status === 404;
          },
          (error) =>
            new Error(
              `Error occurred while checking PID issuer health: ${error}`,
            ),
        )
      : TE.of(true);

  revokeAllCredentials = (fiscalCode: FiscalCode, accessToken: string) =>
    TE.tryCatch(
      async () => {
        const result = await fetch(`${this.#baseURL}/revokeAll`, {
          body: JSON.stringify({
            // TINIT is the CF international format: TIN (Tax Identification Number) and IT (Italy). It is required by the endpoint
            unique_id: `TINIT-${fiscalCode}`,
            wallet_provider: this.#walletProviderEntity,
          }),
          method: "POST",
          signal: AbortSignal.timeout(this.#requestTimeout),
          ...this.#init,
          headers: {
            ...this.#init.headers,
            Authorization: `Bearer ${accessToken}`,
            "X-Client-Cert": btoa(this.#clientCertificate),
          },
        });
        if (result.status === 404) {
          // the endpoint returns 404 if the credentials have already been revoked or do not exist
          // the credentials already revoked => the error is suppressed because our endpoint is idempotent
          // the credentials do not exist => the error is suppressed because our endpoint returns 204 when attempting to revoke non-existent credentials
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
    basePath: Config["entityConfiguration"]["federationEntity"]["basePath"]["href"],
  ) {
    this.#baseURL = baseURL;
    this.#clientCertificate = clientCertificate;
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
