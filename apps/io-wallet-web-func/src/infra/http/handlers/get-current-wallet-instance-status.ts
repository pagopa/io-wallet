import { WalletInstanceToStatus } from "@/encoders/wallet-instance";
import { getCurrentWalletInstance } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { lookup } from "fp-ts/Record";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import { logErrorAndReturnResponse } from "io-wallet-common/http-response";
import { User } from "io-wallet-common/user";

// TODO: SIW-1266. Now in the `authorization` header there is the pdv tokenizer id, later there will be the authentication token
// Move the code to a more central part
const requireAuthorizationHeader = (req: H.HttpRequest) =>
  pipe(
    req.headers,
    lookup("authorization"),
    E.fromOption(
      () => new H.HttpBadRequestError("Missing authorization in header"),
    ),
    E.chainW(
      H.parse(User.props.id, "The content of authorization is not a valid id"),
    ),
  );

const requireUser: (
  req: H.HttpRequest,
) => E.Either<H.HttpBadRequestError | H.ValidationError, User> = flow(
  requireAuthorizationHeader,
  E.map((id) => ({ id })),
);

export const GetCurrentWalletInstanceStatusHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireUser,
      RTE.fromEither,
      RTE.chain(({ id }) => getCurrentWalletInstance(id)),
      RTE.map(WalletInstanceToStatus.encode),
      RTE.map(H.successJson),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
