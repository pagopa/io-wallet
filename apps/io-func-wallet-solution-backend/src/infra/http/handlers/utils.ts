import { flow, pipe } from "fp-ts/function";
import { lookup } from "fp-ts/Record";
import * as E from "fp-ts/lib/Either";
import * as H from "@pagopa/handler-kit";
import { User } from "@/user";

export const successEntityStatementJwt = flow(
  H.success,
  H.withHeader("Content-Type", "application/entity-statement+jwt")
);

export const createdEntityStatementJwt = flow(
  H.createdJson,
  H.withHeader("Content-Type", "application/entity-statement+jwt")
);

const requireUserId = (req: H.HttpRequest) =>
  pipe(
    req.headers,
    lookup("x-iowallet-user-id"),
    E.fromOption(
      () => new H.HttpBadRequestError("Missing x-iowallet-user-id in header")
    ),
    E.chainW(
      H.parse(
        User.props.id,
        "The content of x-iowallet-user-id is not a valid id"
      )
    )
  );

export const requireUser: (
  req: H.HttpRequest
) => E.Either<H.HttpBadRequestError | H.ValidationError, User> = flow(
  requireUserId,
  E.map((id) => ({ id }))
);
