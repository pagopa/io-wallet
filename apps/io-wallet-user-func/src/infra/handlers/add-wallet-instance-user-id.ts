import * as H from "@pagopa/handler-kit";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { WalletInstanceValid } from "io-wallet-common/wallet-instance";

export const AddWalletInstanceUserIdHandler = H.of(
  flow(
    (walletInstances: WalletInstanceValid[]) =>
      walletInstances.map(({ id, userId }) => ({
        id,
        userId,
      })),
    RTE.right,
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "AddWalletInstanceUserId",
        }),
        RTE.fromReader,
      ),
    ),
  ),
);
