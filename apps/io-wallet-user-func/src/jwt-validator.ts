import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as jwt from "jsonwebtoken";

export type HslJwtValidate = (
  token: NonEmptyString,
) => TE.TaskEither<Error, jwt.JwtPayload>;

export interface HslJwtEnvironment {
  hslJwtValidate: HslJwtValidate;
}

export const hslJwtValidate: (
  token: NonEmptyString,
) => RTE.ReaderTaskEither<HslJwtEnvironment, Error, jwt.JwtPayload> =
  (token) =>
  ({ hslJwtValidate }) =>
    hslJwtValidate(token);

export type ExchangeJwtValidate = (
  token: NonEmptyString,
) => TE.TaskEither<Error, jwt.JwtPayload>;

interface ExchangeJwtEnvironment {
  exchangeJwtValidate: ExchangeJwtValidate;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exchangeJwtValidate: (
  token: NonEmptyString,
) => RTE.ReaderTaskEither<ExchangeJwtEnvironment, Error, jwt.JwtPayload> =
  (token) =>
  ({ exchangeJwtValidate }) =>
    exchangeJwtValidate(token);
