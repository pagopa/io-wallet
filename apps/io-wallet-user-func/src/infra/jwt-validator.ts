/* eslint-disable @typescript-eslint/no-unused-vars */
import { HubSpidLoginConfig } from "@/app/config";
import { ExchangeJwtValidate, HslJwtValidate } from "@/jwt-validator";
import { getValidateJWT } from "@pagopa/ts-commons/lib/jwt_with_key_rotation";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import * as jwt from "jsonwebtoken";

const validateAndDecode: (
  issuer: NonEmptyString,
  pubKey: NonEmptyString,
) => (token: NonEmptyString) => TE.TaskEither<Error, jwt.JwtPayload> =
  (issuer, pubKey) => (token) =>
    pipe(token, getValidateJWT(issuer, pubKey));

const IntrospectSuccessResponse = t.type({
  active: t.boolean,
});

const hslIntrospection: (
  clientBaseUrl: NonEmptyString,
) => (token: NonEmptyString) => TE.TaskEither<Error, void> =
  (clientBaseUrl) => (token) =>
    pipe(
      TE.tryCatch(async () => {
        const result = await fetch(new URL("/introspect", clientBaseUrl), {
          body: JSON.stringify({
            token,
          }),
          method: "POST",
          signal: AbortSignal.timeout(3000),
        });
        if (!result.ok) {
          throw new Error(JSON.stringify(await result.json()));
        }
        return result.json();
      }, E.toError),
      TE.chain(
        flow(
          IntrospectSuccessResponse.decode,
          E.mapLeft(
            () =>
              new Error(
                "error validating jwt: inval result format from hub spid login",
              ),
          ),
          TE.fromEither,
        ),
      ),
      TE.chain(
        (response) =>
          response.active ? TE.right(undefined) : TE.left(new Error("")), // deve tornare 403
      ),
    );

export const hslValidate: ({
  clientBaseUrl,
  jwtIssuer,
  jwtPubKey,
}: HubSpidLoginConfig) => HslJwtValidate =
  ({ clientBaseUrl, jwtIssuer, jwtPubKey }) =>
  (token) =>
    pipe(
      token,
      validateAndDecode(jwtIssuer, jwtPubKey),
      // TODO: make the call to hub spid login service
      // TE.chain(() => hslIntrospection(clientBaseUrl)(token)),
    );

const exchangeValidate: ({
  clientBaseUrl,
  jwtIssuer,
  jwtPubKey,
}: HubSpidLoginConfig) => ExchangeJwtValidate =
  ({ jwtIssuer, jwtPubKey }) =>
  (token) =>
    pipe(token, validateAndDecode(jwtIssuer, jwtPubKey));
