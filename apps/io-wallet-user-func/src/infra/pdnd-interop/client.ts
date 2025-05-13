import { PdndInteropApiClientConfig } from "@/app/config";
import * as TE from "fp-ts/lib/TaskEither";
import { ServiceUnavailableError } from "io-wallet-common/error";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import { VoucherRepository } from "../voucher";
export class PdndInteropClient implements VoucherRepository {
  static readonly CLIENT_ASSERTION_JWT_ALGORITHM = "RS256";
  static readonly CLIENT_ASSERTION_JWT_TYPE = "JWT";
  static readonly CLIENT_ASSERTION_TYPE =
    "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
  static readonly GRANT_TYPE = "client_credentials";
  #audience: string;
  #baseURL: string;
  #clientId: string;
  #kidId: string;
  #privateKey: string;
  #requestTimeout: number;
  generateClientAssertion = () =>
    jwt.sign(
      {
        aud: this.#audience,
        exp: Math.floor(Date.now() / 1000) + 600,
        iat: Math.floor(Date.now() / 1000),
        iss: this.#clientId,
        jti: "jti_" + uuidv4().toString(),
        sub: this.#clientId,
      },
      this.#privateKey,
      {
        algorithm: PdndInteropClient.CLIENT_ASSERTION_JWT_ALGORITHM,
        header: {
          alg: PdndInteropClient.CLIENT_ASSERTION_JWT_ALGORITHM,
          kid: this.#kidId,
          typ: PdndInteropClient.CLIENT_ASSERTION_JWT_TYPE,
        },
      },
    );

  requestVoucher = () =>
    TE.tryCatch(
      async () => {
        const result = await fetch(new URL("/authorize", this.#baseURL), {
          body: JSON.stringify({
            client_assertion: this.generateClientAssertion(),
            client_assertion_type: PdndInteropClient.CLIENT_ASSERTION_TYPE,
            client_id: this.#clientId,
            grant_type: PdndInteropClient.GRANT_TYPE,
          }),
          method: "POST",
          signal: AbortSignal.timeout(this.#requestTimeout),
        });
        if (!result.ok) {
          throw new Error(JSON.stringify(await result.json()));
        }
        const response = await result.json();
        if (typeof response.access_token !== "string") {
          throw new Error(
            "Invalid response: access_token is missing or not a string",
          );
        }
        return response.access_token;
      },
      (error) =>
        error instanceof Error && error.name === "TimeoutError"
          ? new ServiceUnavailableError(
              `The request to the PDND Interop Service has timed out: ${error.message}`,
            )
          : new Error(
              `Error occurred while making a request to the PDND Interop Service: ${error}`,
            ),
    );
  constructor({
    audience,
    baseURL,
    clientId,
    kidId,
    privateKey,
    requestTimeout,
  }: PdndInteropApiClientConfig) {
    this.#kidId = kidId;
    this.#baseURL = baseURL;
    this.#audience = audience;
    this.#clientId = clientId;
    this.#privateKey = privateKey;
    this.#requestTimeout = requestTimeout;
  }
}
