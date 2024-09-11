import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import { DeviceDetails } from "io-wallet-common/device-details";
import { WalletInstance } from "io-wallet-common/wallet-instance";

const WalletInstanceApiModel = t.intersection([
  t.type({
    created_at: IsoDateFromString,
    id: NonEmptyString,
    is_revoked: t.boolean,
  }),
  t.partial({
    device_details: DeviceDetails,
    revoked_at: IsoDateFromString,
  }),
]);

type WalletInstanceApiModel = t.TypeOf<typeof WalletInstanceApiModel>;

export const WalletInstanceToApiModel: t.Encoder<
  WalletInstance,
  WalletInstanceApiModel
> = {
  encode: ({
    createdAt,
    deviceDetails,
    id,
    isRevoked,
    ...additionalFields
  }) => {
    const baseFields = {
      created_at: createdAt,
      device_details: deviceDetails,
      id,
      is_revoked: isRevoked,
    };
    return "revokedAt" in additionalFields
      ? {
          ...baseFields,
          revoked_at: additionalFields.revokedAt,
        }
      : baseFields;
  },
};
