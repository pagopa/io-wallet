import { QueueClient } from "@azure/storage-queue";
import * as E from "fp-ts/lib/Either";
import * as J from "fp-ts/lib/Json";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { WalletInstance } from "io-wallet-common/wallet-instance";

export interface IWalletInstanceCreationQueue {
  insert: (walletInstance: WalletInstance) => TE.TaskEither<Error, void>;
}

export class WalletInstanceCreationStorageQueue
  implements IWalletInstanceCreationQueue
{
  #client: QueueClient;

  insert = (walletInstance: WalletInstance) =>
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

  constructor(client: QueueClient) {
    this.#client = client;
  }
}
