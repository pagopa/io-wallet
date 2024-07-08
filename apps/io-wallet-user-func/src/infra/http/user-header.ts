import { User } from "@/user";
import * as H from "@pagopa/handler-kit";
import { lookup } from "fp-ts/Record";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";

export const requireUserFromHeader = (req: H.HttpRequest) =>
  pipe(
    req.headers,
    lookup("x-iowallet-user-id"),
    E.fromOption(
      () => new H.HttpBadRequestError("Missing x-iowallet-user-id in header"),
    ),
    E.chainW(
      H.parse(
        User.props.id,
        "The content of x-iowallet-user-id is not a valid id",
      ),
    ),
    E.map((id) => ({ id })),
  );

// qui la sperimentazione non entra
