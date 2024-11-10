import { AddWalletInstanceToValidationQueueHandler } from "@/infra/handlers/add-wallet-instance-to-validation-queue";
import { azureFunction } from "@pagopa/handler-kit-azure-func";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

export const AddWalletInstanceToValidationQueueFunction = azureFunction(
  pipe(
    AddWalletInstanceToValidationQueueHandler,
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "addWalletInstanceToValidationQueue",
        }),
        RTE.fromReader,
      ),
    ),
  ),
);
