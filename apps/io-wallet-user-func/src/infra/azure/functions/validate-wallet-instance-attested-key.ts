import { ValidateWalletInstanceAttestedKeyHandler } from "@/infra/handlers/validate-wallet-instance-attested-key";
import { azureFunction } from "@pagopa/handler-kit-azure-func";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

export const ValidateWalletInstanceAttestedKeyFunction = azureFunction(
  pipe(
    ValidateWalletInstanceAttestedKeyHandler,
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "validateWalletInstance",
        }),
        RTE.fromReader,
      ),
    ),
  ),
);
