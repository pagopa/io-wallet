import * as H from "@pagopa/handler-kit";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

import { revokeInvalidWalletInstances } from "@/wallet-instance-revocation-process";

export const ValidateWalletInstanceAttestedKeyHandler = H.of(
  flow(
    revokeInvalidWalletInstances,
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
