import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as jwt from "jsonwebtoken";

// hsl.ts file
export type JwtValidate = (
  token: NonEmptyString,
) => TE.TaskEither<Error, jwt.JwtPayload>;

export interface HslJwtEnvironment {
  hslValidate: JwtValidate;
}

export const jwtValidate: (
  token: NonEmptyString,
) => RTE.ReaderTaskEither<HslJwtEnvironment, Error, jwt.JwtPayload> =
  (token) =>
  ({ hslValidate }) =>
    hslValidate(token);

// exchange.ts file
export type ExchangeJwtValidate = (
  token: NonEmptyString,
) => TE.TaskEither<Error, jwt.JwtPayload>;

interface ExchangeJwtEnvironment {
  exchangeValidate: ExchangeJwtValidate;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exchangeJwtValidate: (
  token: NonEmptyString,
) => RTE.ReaderTaskEither<ExchangeJwtEnvironment, Error, jwt.JwtPayload> =
  (token) =>
  ({ exchangeValidate }) =>
    exchangeValidate(token);
