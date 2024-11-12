import { getCurrentWalletInstance } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { lookup } from "fp-ts/Record";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import { WalletInstanceToStatusApiModel } from "../encoders/wallet-instance";

const requireFiscalCode = (req: H.HttpRequest) =>
  pipe(
    req.headers,
    lookup("fiscal-code"),
    E.fromOption(
      () => new H.HttpBadRequestError("Missing fiscal-code in header"),
    ),
    E.chainW(
      H.parse(
        FiscalCode,
        "The content of fiscal-code header is not a valid fiscal code",
      ),
    ),
  );

export const GetCurrentWalletInstanceStatusHandler = H.of(
  (req: H.HttpRequest) =>
    pipe(
      req,
      requireFiscalCode,
      RTE.fromEither,
      RTE.chainW((fiscalCode) =>
        pipe(
          getCurrentWalletInstance(fiscalCode),
          RTE.map(WalletInstanceToStatusApiModel.encode),
          RTE.map(H.successJson),
          RTE.orElseFirstW((error) =>
            pipe(
              sendTelemetryException(error, {
                fiscalCode,
                functionName: "getCurrentWalletInstanceStatus",
              }),
              RTE.fromReader,
            ),
          ),
        ),
      ),
      RTE.orElseW(logErrorAndReturnResponse),
    ),
);
