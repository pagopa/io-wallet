import {
  WalletInstanceValid,
  insertWalletInstance,
  revokeUserWalletInstancesExceptOne,
} from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

export const CreateWalletInstanceHandler = H.of(
  (walletInstance: WalletInstanceValid) =>
    pipe(
      insertWalletInstance(walletInstance),
      RTE.chainW(() =>
        revokeUserWalletInstancesExceptOne(
          walletInstance.userId,
          walletInstance.id,
        ),
      ),
    ),
);
