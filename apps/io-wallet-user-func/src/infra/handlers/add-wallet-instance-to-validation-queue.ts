import { filterValidWithAndroidCertificatesChain } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

export const AddWalletInstanceToValidationQueueHandler = H.of(
  flow(
    filterValidWithAndroidCertificatesChain,
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
