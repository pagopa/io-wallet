import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import { WalletProviderMetadata } from "./wallet-provider";

type EntityConfigurationEnvironment = {
  walletProviderMetadata: WalletProviderMetadata;
};

type EntityConfigurationPayload = {
  walletProviderMetadata: WalletProviderMetadata;
};

export const getEntityConfiguration =
  (): RTE.ReaderTaskEither<
    EntityConfigurationEnvironment,
    Error,
    EntityConfigurationPayload
  > =>
  ({ walletProviderMetadata }) =>
    pipe(
      {
        walletProviderMetadata,
      },
      TE.of
    );
