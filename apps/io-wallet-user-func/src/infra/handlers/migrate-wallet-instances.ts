import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { WalletInstance } from "io-wallet-common/wallet-instance";

export const MigrateWalletInstancesHandler = H.of(
  (walletInstances: WalletInstance[]) =>
    pipe(
      RTE.right(walletInstances),
      RTE.orElseFirstW((error) =>
        pipe(
          sendTelemetryException(error, {
            functionName: "migrateWalletInstances",
          }),
          RTE.fromReader,
        ),
      ),
    ),
);
