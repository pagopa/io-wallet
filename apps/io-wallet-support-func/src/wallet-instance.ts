import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { WalletInstance } from "io-wallet-common/wallet-instance";

export interface WalletInstanceRepository {
  getLastByUserId: (
    userId: WalletInstance["userId"],
  ) => TE.TaskEither<Error, O.Option<WalletInstance>>;
}

export interface WalletInstanceEnvironment {
  walletInstanceRepository: WalletInstanceRepository;
}
