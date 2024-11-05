import { checkWalletInstancesAttestedKeyRevocation } from "@/android-key-attestation";
import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

export const CheckWalletInstancesAttestedKeyRevocationHandler = H.of(() =>
  pipe(
    checkWalletInstancesAttestedKeyRevocation,
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "checkWalletInstancesAttestedKeyRevocation",
        }),
        RTE.fromReader,
      ),
    ),
  ),
);
