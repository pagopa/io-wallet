import * as H from "@pagopa/handler-kit";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { WalletInstance } from "io-wallet-common/wallet-instance";

import { sendTelemetryException } from "@/infra/telemetry";

export const MigrateWalletInstancesHandler = H.of(
  (walletInstances: WalletInstance[]) =>
    pipe(
      walletInstances,
      RTE.right,
      RTE.orElseFirstW(
        flow(
          sendTelemetryException({
            functionName: "migrateWalletInstances",
          }),
          RTE.fromEither,
        ),
      ),
    ),
);
