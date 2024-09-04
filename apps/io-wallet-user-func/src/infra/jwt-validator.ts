/* eslint-disable @typescript-eslint/no-unused-vars */
import { JwtValidatorConfig } from "@/app/config";
import { UnauthorizedError } from "@/error";
import { JwtValidate } from "@/jwt-validator";
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
          signal: AbortSignal.timeout(3000), // TODO [SIW-1332]: make this timeout configurable through env vars
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
      TE.chain((response) =>
        response.active
          ? TE.right(undefined)
          : TE.left(new UnauthorizedError()),
      ),
    );

const hslJwtValidate: ({
  clientBaseUrl,
  jwtIssuer,
  jwtPubKey,
}: JwtValidatorConfig["hubSpidLogin"]) => JwtValidate =
  ({ clientBaseUrl, jwtIssuer, jwtPubKey }) =>
  (token) =>
    pipe(
      token,
      validateAndDecode(jwtIssuer, jwtPubKey),
      // TODO [SIW-1327]: make the call to hub spid login service
      // TE.chainFirst(() => pipe(token, hslIntrospection(clientBaseUrl))),
    );

const exchangeJwtValidate: ({
  jwtIssuer,
  jwtPubKey,
}: JwtValidatorConfig["exchange"]) => JwtValidate =
  ({ jwtIssuer, jwtPubKey }) =>
  (token) =>
    pipe(token, validateAndDecode(jwtIssuer, jwtPubKey));

// there are two types of tokens
// one issued by the hub SPID login when the user logs in directly (validated with hslJwtValidate)
// and another issued when the user enters via a magic link (validated with exchangeJwtValidate)
// this function returns 'Right' if at least one of these validations returns 'Right'.
export const jwtValidate: ({
  exchange,
  hubSpidLogin,
}: JwtValidatorConfig) => JwtValidate =
  ({ exchange, hubSpidLogin }) =>
  (token) =>
    pipe(
      token,
      hslJwtValidate(hubSpidLogin),
      TE.orElse(() => pipe(token, exchangeJwtValidate(exchange))),
      TE.mapLeft(() => new UnauthorizedError()),
    );
