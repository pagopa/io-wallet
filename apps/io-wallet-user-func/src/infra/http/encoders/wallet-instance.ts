import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import { WalletInstance } from "io-wallet-common/wallet-instance";

const WalletInstanceStatusApiModel = t.type({
  id: NonEmptyString,
  is_revoked: t.boolean,
});

type WalletInstanceStatusApiModel = t.TypeOf<
  typeof WalletInstanceStatusApiModel
>;

export const WalletInstanceToStatusApiModel: t.Encoder<
  WalletInstance,
  WalletInstanceStatusApiModel
> = {
  encode: ({ id, isRevoked }) => ({
    id,
    is_revoked: isRevoked,
  }),
};
