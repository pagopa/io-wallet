import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as jwt from "jsonwebtoken";

export type JwtValidate = (
  token: NonEmptyString,
) => TE.TaskEither<Error, jwt.JwtPayload>;

export interface JwtEnvironment {
  jwtValidate: JwtValidate;
}

export const jwtValidate: (
  token: NonEmptyString,
) => RTE.ReaderTaskEither<JwtEnvironment, Error, jwt.JwtPayload> =
  (token) =>
  ({ jwtValidate }) =>
    jwtValidate(token);
