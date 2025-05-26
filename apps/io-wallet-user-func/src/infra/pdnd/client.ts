import { PdndApiClientConfig } from "@/app/config";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { ServiceUnavailableError } from "io-wallet-common/error";
import * as jose from "jose";
import { v4 as uuidv4 } from "uuid";

import { VoucherRepository } from "../voucher";

export const RequestVoucherResponseSchema = t.type({
  access_token: NonEmptyString,
});

export type RequestVoucherResponseSchema = t.TypeOf<
  typeof RequestVoucherResponseSchema
>;

export class PdndClient implements VoucherRepository {
  static readonly CLIENT_ASSERTION_JWT_ALGORITHM = "RS256";
  static readonly CLIENT_ASSERTION_JWT_TYPE = "JWT";
  static readonly CLIENT_ASSERTION_TYPE =
    "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
  static readonly GRANT_TYPE = "client_credentials";
  #audience: string;
  #clientAssertionPrivateKey: string;
  #clientId: string;
  #kid: string;
  #purposeId: string;
  #requestTimeout: number;
  #url: string;
  generateClientAssertion = async () =>
    new jose.SignJWT({
      aud: this.#audience,
      iss: this.#clientId,
      jti: uuidv4().toString(),
      purposeId: this.#purposeId,
      sub: this.#clientId,
    })
      .setProtectedHeader({
        alg: PdndClient.CLIENT_ASSERTION_JWT_ALGORITHM,
        kid: this.#kid,
        typ: PdndClient.CLIENT_ASSERTION_JWT_TYPE,
      })
      .setIssuedAt()
      .setExpirationTime("10 minutes")
      .sign(
        await jose.importPKCS8(
          this.#clientAssertionPrivateKey,
          PdndClient.CLIENT_ASSERTION_JWT_ALGORITHM,
        ),
      );

  requestVoucher = () =>
    TE.tryCatch(
      async () => {
        const result = await fetch(this.#url, {
          body: JSON.stringify({
            client_assertion: await this.generateClientAssertion(),
            client_assertion_type: PdndClient.CLIENT_ASSERTION_TYPE,
            client_id: this.#clientId,
            grant_type: PdndClient.GRANT_TYPE,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: AbortSignal.timeout(this.#requestTimeout),
        });
        if (!result.ok) {
          throw new Error(JSON.stringify(await result.json()));
        }

        const response = await result.json();
        const validation = RequestVoucherResponseSchema.decode(response);

        if (!E.isRight(validation)) {
          throw new Error("Invalid response format");
        }

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
    clientAssertionPrivateKey,
    clientId,
    kid,
    purposeId,
    requestTimeout,
    url,
  }: PdndApiClientConfig) {
    this.#kid = kid;
    this.#url = url;
    this.#audience = audience;
    this.#clientId = clientId;
    this.#clientAssertionPrivateKey = clientAssertionPrivateKey;
    this.#requestTimeout = requestTimeout;
    this.#purposeId = purposeId;
  }
}
