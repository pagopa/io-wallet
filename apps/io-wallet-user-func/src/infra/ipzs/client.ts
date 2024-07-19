import { IPZSApiClientConfig } from "@/app/config";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { Agent, RequestInit, fetch } from "undici";

export class CredentialsNotFound extends Error {
  name = "CredentialsNotFound";
  constructor() {
    super("No credentials found or credentials are already revoked.");
  }
}

export interface IpzsApiClient {
  healthCheck: () => TE.TaskEither<Error, boolean>;
  revokeAllCredentials: (fiscalCode: FiscalCode) => TE.TaskEither<Error, void>;
}

export const revokeAllCredentials: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<{ ipzsClient: IpzsApiClient }, Error, void> =
  (fiscalCode) =>
  ({ ipzsClient }) =>
    ipzsClient.revokeAllCredentials(fiscalCode);

export const getIpzsHealth: RTE.ReaderTaskEither<
  {
    ipzsClient: IpzsApiClient;
  },
  Error,
  true
> = ({ ipzsClient: { healthCheck } }) =>
  pipe(
    healthCheck(),
    TE.flatMap((isHealth) =>
      !isHealth ? TE.left(new Error("ipzs-error")) : TE.right(isHealth),
    ),
  );

export class IpzsClient implements IpzsApiClient {
  #baseURL: string;
  #init: RequestInit;
  #walletProviderEntity: string;

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
      (error) => new Error(`error checking IPZS services health: ${error}`),
    );

  revokeAllCredentials = (fiscalCode: FiscalCode) =>
    pipe(
      TE.tryCatch(
        async () => {
          const result = await fetch(new URL("/revokeAll", this.#baseURL), {
            body: JSON.stringify({
              unique_id: fiscalCode,
              wallet_provider: this.#walletProviderEntity,
            }),
            method: "POST",
            signal: AbortSignal.timeout(3000),
            ...this.#init,
          });
          if (result.status === 404) {
            throw new CredentialsNotFound();
          }
          if (!result.ok) {
            throw new Error(JSON.stringify(await result.json()));
          }
        },
        (error) =>
          error instanceof CredentialsNotFound
            ? error
            : new Error(`error revoking all user credentials: ${error}`),
      ),
    );

  constructor({
    baseURL,
    clientCertificate,
    clientPrivateKey,
    rootCACertificate,
    walletProviderEntity,
  }: IPZSApiClientConfig) {
    this.#baseURL = baseURL;
    this.#walletProviderEntity = walletProviderEntity;
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
