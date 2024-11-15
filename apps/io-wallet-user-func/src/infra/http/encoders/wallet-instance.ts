import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import { WalletInstance } from "io-wallet-common/wallet-instance";

const WalletInstanceStatusApiModel = t.intersection([
  t.type({ id: NonEmptyString, is_revoked: t.boolean }),
  t.partial({
    revocationReason: t.string,
  }),
]);

type WalletInstanceStatusApiModel = t.TypeOf<
  typeof WalletInstanceStatusApiModel
>;

export const WalletInstanceToStatusApiModel: t.Encoder<
  WalletInstance,
  WalletInstanceStatusApiModel
> = {
  encode: ({ id, isRevoked, ...additionalFields }) => ({
    id,
    is_revoked: isRevoked,
    ...("revocationReason" in additionalFields && {
      revocation_reason: additionalFields.revocationReason,
    }),
  }),
};
