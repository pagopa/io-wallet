import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

import { AndroidDeviceDetails, DeviceDetails } from "./device-details";
import { JwkPublicKey } from "./jwk";

const WalletInstanceBase = t.intersection([
  t.type({
    createdAt: IsoDateFromString,
    hardwareKey: JwkPublicKey,
    id: NonEmptyString,
    signCount: t.number,
    userId: FiscalCode,
  }),
  t.partial({
    deviceDetails: DeviceDetails,
  }),
]);

export const WalletInstanceValid = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(false),
  }),
]);

export type WalletInstanceValid = t.TypeOf<typeof WalletInstanceValid>;

export enum RevocationReason {
  certificateExpiredOrInvalid = "CERTIFICATE_EXPIRED_OR_INVALID",
  certificateRevoked = "CERTIFICATE_REVOKED_BY_ISSUER",
  newWalletInstanceCreated = "NEW_WALLET_INSTANCE_CREATED",
  revokedThroughAppIo = "REVOKED_THROUGH_APP_IO",
  revokedThroughIoWeb = "REVOKED_THROUGH_IO_WEB",
}

const WalletInstanceRevoked = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(true),
    revokedAt: IsoDateFromString,
  }),
  t.partial({
    revocationReason: t.keyof(RevocationReason),
  }),
]);

export const WalletInstance = t.union([
  WalletInstanceValid,
  WalletInstanceRevoked,
]);

export type WalletInstance = t.TypeOf<typeof WalletInstance>;

export const WalletInstanceValidWithAndroidCertificatesChain = t.intersection([
  WalletInstanceValid,
  t.type({
    deviceDetails: t.intersection([
      AndroidDeviceDetails,
      t.type({
        x509Chain: t.array(t.string),
      }),
    ]),
  }),
]);

export type WalletInstanceValidWithAndroidCertificatesChain = t.TypeOf<
  typeof WalletInstanceValidWithAndroidCertificatesChain
>;
