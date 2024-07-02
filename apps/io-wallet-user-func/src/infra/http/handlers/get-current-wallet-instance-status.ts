import { WalletInstanceToStatus } from "@/encoders/wallet-instance";
import { getCurrentWalletInstance } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";

import { logErrorAndReturnResponse } from "../response";
import { requireUser } from "./token-auth";

export const GetCurrentWalletInstanceStatusHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireUser,
      RTE.chainW(({ id }) => getCurrentWalletInstance(id)),
      RTE.map(WalletInstanceToStatus.encode),
      RTE.map(H.successJson),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
