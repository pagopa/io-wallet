import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { lookup } from "fp-ts/Record";

export const requireWalletInstanceId: (
  req: H.HttpRequest,
) => E.Either<Error, NonEmptyString> = (req) =>
  pipe(
    req.path,
    lookup("id"),
    E.fromOption(() => new H.HttpBadRequestError(`Missing "id" in path`)),
    E.chainW(H.parse(NonEmptyString, `Invalid "id" supplied`)),
  );
