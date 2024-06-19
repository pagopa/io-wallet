import { getCurrentWalletInstance } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { logErrorAndReturnResponse } from "io-wallet-common/http-response";

export const GetCurrentWalletInstanceStatusHandler = H.of(() =>
  pipe(
    // this is a fake UUID
    "f61f9cc6-e1b8-4040-89ac-46418780c6a9" as NonEmptyString,
    getCurrentWalletInstance,
    RTE.map((walletInstance) => ({
      id: walletInstance.id,
      is_revoked: walletInstance.isRevoked,
    })),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
