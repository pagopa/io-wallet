import { Config } from "@/app/config";
import {
  User,
  UserTrialSubscriptionEnvironment,
  checkUserSubscription,
} from "@/user";
import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/ReaderTaskEither";
import { lookup } from "fp-ts/Record";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";

import { UnauthorizedError } from "../response";

export const successEntityStatementJwt = flow(
  H.success,
  H.withHeader("Content-Type", "application/entity-statement+jwt"),
);

export const successJwt = flow(
  H.success,
  H.withHeader("Content-Type", "application/jwt"),
);

const requireUserId = (req: H.HttpRequest) =>
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
  );

export const requireUser: (req: H.HttpRequest) => RTE.ReaderTaskEither<
  {
    trialSystemFeatureFlag: Config["trialSystem"]["featureFlag"]; // mettere un tipo da esportare in user?
  } & UserTrialSubscriptionEnvironment,
  Error | H.HttpBadRequestError | H.ValidationError | UnauthorizedError, // TODO
  User
> = flow(
  requireUserId,
  E.map((id) => ({ id })),
  RTE.fromEither,
  RTE.chainFirstW(
    flow(
      checkUserSubscription,
      RTE.mapLeft(() => new UnauthorizedError()),
    ),
  ),
);
