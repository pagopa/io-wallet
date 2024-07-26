import { Config, PidIssuerApiClientConfig } from "@/app/config";
import { CredentialRepository } from "@/credential";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { Agent, RequestInit, fetch } from "undici";

import { PidIssuerHealthCheck } from "./health-check";

export class PidIssuerClient
  implements CredentialRepository, PidIssuerHealthCheck
{
  #baseURL: string;
  #init: RequestInit;
  #walletProviderEntity: UrlFromString;

  healthCheck = () =>
    TE.tryCatch(
      async () => {
        const result = await fetch(new URL(`/revokeAll`, this.#baseURL), {
          body: JSON.stringify({
            unique_id: "foo",
            wallet_provider: this.#walletProviderEntity,
          }),
          method: "POST",
          signal: AbortSignal.timeout(3000),
          ...this.#init,
        });
        return result.status === 404;
      },
      (error) => new Error(`error checking PID issuer health: ${error}`),
    );

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
            signal: AbortSignal.timeout(3000),
            ...this.#init,
          });

          if (result.status === 404) {
            // if the credentials have already been revoked the status is 404 but our endpoint is idempotent
            // TODO: SIW-1402 add log
            return undefined;
          }
          if (!result.ok) {
            throw new Error(JSON.stringify(await result.json()));
          }
        },
        (error) => new Error(`error revoking all user credentials: ${error}`),
      ),
    );

  constructor(
    {
      baseURL,
      clientCertificate,
      clientPrivateKey,
      rootCACertificate,
    }: PidIssuerApiClientConfig,
    basePath: Config["federationEntity"]["basePath"],
  ) {
    this.#baseURL = baseURL;
    this.#walletProviderEntity = basePath;
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
  }
}
