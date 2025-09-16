import { QueueClient } from "@azure/storage-queue";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as J from "fp-ts/lib/Json";
import * as TE from "fp-ts/lib/TaskEither";
import { WalletInstanceValidWithAndroidCertificatesChain } from "io-wallet-common/wallet-instance";

import { IWalletInstanceRevocationStorageQueue } from "@/wallet-instance-revocation-process";

export class WalletInstanceRevocationStorageQueue
  implements IWalletInstanceRevocationStorageQueue
{
  #client: QueueClient;

  constructor(client: QueueClient) {
    this.#client = client;
  }

  insert = (walletInstance: WalletInstanceValidWithAndroidCertificatesChain) =>
    pipe(
      walletInstance,
      J.stringify,
      E.mapLeft(() => new Error("Unable to stringify Wallet Instance")),
      E.chain((jsonString) =>
        E.tryCatch(() => Buffer.from(jsonString).toString("base64"), E.toError),
      ),
      TE.fromEither,
      TE.chain((walletInstanceString) =>
        TE.tryCatch(
          () =>
            this.#client.sendMessage(walletInstanceString, {
              visibilityTimeout: 60 * 60 * 24, // 24 hours
            }),
          E.toError,
        ),
      ),
      TE.map(() => undefined),
    );
}
