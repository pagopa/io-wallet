import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/lib/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { getCurrentWalletInstance } from "@/wallet-instance";

import { WalletInstanceToStatusApiModel } from "../encoders/wallet-instance";
import { requireFiscalCodeFromHeader } from "../fiscal-code";

export const GetCurrentWalletInstanceStatusHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireFiscalCodeFromHeader,
      RTE.fromEither,
      RTE.chainW((fiscalCode) =>
        pipe(
          getCurrentWalletInstance(fiscalCode),
          RTE.map(WalletInstanceToStatusApiModel.encode),
          RTE.map(H.successJson),
          // RTE.orElseFirstW((error) =>
          //   pipe(
          //     sendTelemetryException(error, {
          //       fiscalCode,
          //       functionName: "getCurrentWalletInstanceStatus",
          //     }),
          //     RTE.fromReader,
          //   ),
          // ),
        ),
      ),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
