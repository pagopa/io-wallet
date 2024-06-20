import { WalletInstance } from "@/wallet-instance";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

const WalletInstanceStatus = t.type({
  id: NonEmptyString,
  is_revoked: t.boolean,
});

type WalletInstanceStatus = t.TypeOf<typeof WalletInstanceStatus>;

export const WalletInstanceToStatus: t.Encoder<
  WalletInstance,
  WalletInstanceStatus
> = {
  encode: ({ id, isRevoked }) => ({
    id,
    is_revoked: isRevoked,
  }),
};
