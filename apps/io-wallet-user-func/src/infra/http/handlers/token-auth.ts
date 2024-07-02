import { User, UserEnvironment, getUserByFiscalCode } from "@/user";
import * as H from "@pagopa/handler-kit";
import {
  FiscalCode,
  NonEmptyString,
  PatternString,
} from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/ReaderTaskEither";
import { lookup } from "fp-ts/Record";
import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import * as jwt from "jsonwebtoken";

const AuthBearer = PatternString("^Bearer [a-zA-Z0-9-_].+");
type AuthBearer = t.TypeOf<typeof AuthBearer>;

const JWTWithFiscalCode = t.type({
  fiscal_number: FiscalCode,
});

const requireAuthorizationHeader: (
  req: H.HttpRequest,
) => E.Either<H.HttpBadRequestError, string> = (req) =>
  pipe(
    req.headers,
    lookup("authorization"),
    E.fromOption(
      () => new H.HttpBadRequestError("Missing authorization in header"),
    ),
  );

const requireBearerToken: (
  header: string,
) => E.Either<H.ValidationError, NonEmptyString> = flow(
  H.parse(
    AuthBearer,
    "The content of authorization is not a valid Bearer token",
  ),
  E.map((authBearer) => authBearer.replace("Bearer ", "")),
  E.chainW(H.parse(NonEmptyString, "Missing Bearer token")),
);

const requireFiscalCode: (
  token: string,
) => E.Either<H.ValidationError, FiscalCode> = flow(
  jwt.decode,
  H.parse(JWTWithFiscalCode),
  E.map(({ fiscal_number }) => fiscal_number),
);

// TODO: SIW-1266. This function takes the Authorization header and extracts the CF from the token without verifying the token
export const requireUser: (
  req: H.HttpRequest,
) => RTE.ReaderTaskEither<UserEnvironment, Error, User> = flow(
  requireAuthorizationHeader,
  E.chainW(requireBearerToken),
  E.chainW(requireFiscalCode),
  RTE.fromEither,
  RTE.chain(getUserByFiscalCode),
);
