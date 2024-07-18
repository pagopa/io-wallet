import { revokeAllCredentials } from "@/infra/ipzs/client";
import { getFiscalCodeByUserId } from "@/user";
import { revokeUserWalletInstances } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import { lookup } from "fp-ts/Record";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { logErrorAndReturnResponse } from "../error";
import { requireWhitelistedUserFromToken } from "../whitelisted-user";

const requireWalletInstanceId: (
  req: H.HttpRequest,
) => E.Either<Error, NonEmptyString> = (req) =>
  pipe(
    req.path,
    lookup("id"),
    E.fromOption(() => new H.HttpBadRequestError(`Missing "id" in path`)),
    E.chainW(H.parse(NonEmptyString, `Invalid "id" supplied`)),
  );

const SetWalletInstanceStatusBody = t.literal("REVOKED");

type SetWalletInstanceStatusBody = t.TypeOf<typeof SetWalletInstanceStatusBody>;

const requireSetWalletInstanceStatusBody: (
  req: H.HttpRequest,
) => E.Either<Error, SetWalletInstanceStatusBody> = (req) =>
  pipe(req.body, H.parse(SetWalletInstanceStatusBody, "Invalid body supplied"));

export const SetWalletInstanceStatusHandler = H.of((req: H.HttpRequest) =>
  pipe(
    sequenceS(RTE.ApplyPar)({
      body: pipe(req, requireSetWalletInstanceStatusBody, RTE.fromEither),
      userId: pipe(req, requireWhitelistedUserFromToken),
      walletInstanceId: pipe(req, requireWalletInstanceId, RTE.fromEither),
    }),
    // invoke IPZS services to revoke all credentials for that user
    RTE.chainFirstW(({ userId: { id } }) =>
      pipe(
        getFiscalCodeByUserId(id),
        RTE.map(({ fiscalCode }) => fiscalCode),
        RTE.chainW(revokeAllCredentials),
      ),
    ),
    // access our database to revoke the wallet instance
    RTE.chainFirstW(({ userId, walletInstanceId }) =>
      revokeUserWalletInstances(userId.id, [walletInstanceId]),
    ),
    RTE.map(() => H.empty),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
