import { getCurrentWalletInstance } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { WalletInstanceToStatus } from "io-wallet-common/wallet-instance";

import { requireWhitelistedUserFromToken } from "../whitelisted-user";

export const GetCurrentWalletInstanceStatusHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireWhitelistedUserFromToken,
      RTE.chainW(({ id }) => getCurrentWalletInstance(id)),
      RTE.map(WalletInstanceToStatus.encode),
      RTE.map(H.successJson),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
