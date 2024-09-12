import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import {
  AndroidDeviceDetails,
  IosDeviceDetails,
} from "io-wallet-common/device-details";
import { WalletInstance } from "io-wallet-common/wallet-instance";

const androidDevicePlatform = AndroidDeviceDetails.types[0].props.platform;

const androidDeviceOptionalFields = AndroidDeviceDetails.types[1].props;

const DeviceDetails = t.union([
  IosDeviceDetails,
  t.intersection([
    t.type({
      platform: androidDevicePlatform,
    }),
    t.partial({
      os_patch_level: androidDeviceOptionalFields.osPatchLevel,
      os_version: androidDeviceOptionalFields.osVersion,
    }),
  ]),
]);

type DeviceDetails = t.TypeOf<typeof DeviceDetails>;

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
  }) => ({
    created_at: createdAt,
    id,
    is_revoked: isRevoked,
    ...("revokedAt" in additionalFields && {
      revoked_at: additionalFields.revokedAt,
    }),
    ...(deviceDetails && {
      device_details: {
        platform: deviceDetails.platform,
        ...(deviceDetails.platform === "android" && {
          os_patch_level: deviceDetails.osPatchLevel,
          os_version: deviceDetails.osVersion,
        }),
      },
    }),
  }),
};
