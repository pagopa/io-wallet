import * as t from "io-ts";

import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import { LoA, LoAValues, WalletProviderMetadata } from "./wallet-provider";

type EntityConfigurationEnvironment = {
  walletProviderMetadata: WalletProviderMetadata;
};

export const EntityConfigurationPayload = t.type({
  iss: t.string,
  sub: t.string,
  token_endpoint: t.string,
  ascValues: t.array(LoAValues),
});
export type EntityConfigurationPayload = t.TypeOf<
  typeof EntityConfigurationPayload
>;

export const getEntityConfiguration =
  (): RTE.ReaderTaskEither<
    EntityConfigurationEnvironment,
    Error,
    EntityConfigurationPayload
  > =>
  ({ walletProviderMetadata }) =>
    pipe(
      {
        iss: walletProviderMetadata.basePath.href,
        sub: walletProviderMetadata.basePath.href,
        token_endpoint: walletProviderMetadata.basePath.href + "/token",
        ascValues: [LoA.basic, LoA.medium, LoA.hight],
      },
      TE.of
    );
