import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

import {
  AndroidDeviceDetails,
  DeviceDetails,
  DeviceDetailsRevokedWI,
} from "./device-details";
import { JwkPublicKey } from "./jwk";

const WalletInstanceBase = t.type({
  createdAt: IsoDateFromString,
  hardwareKey: JwkPublicKey,
  id: NonEmptyString,
  signCount: t.number,
  userId: FiscalCode,
});

export const WalletInstanceValid = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(false),
  }),
  t.partial({
    deviceDetails: DeviceDetails,
  }),
]);

export type WalletInstanceValid = t.TypeOf<typeof WalletInstanceValid>;

export const RevocationReason = t.union([
  t.literal("CERTIFICATE_REVOKED_BY_ISSUER"),
  t.literal("NEW_WALLET_INSTANCE_CREATED"),
  t.literal("REVOKED_BY_USER"),
]);
export type RevocationReason = t.TypeOf<typeof RevocationReason>;

const WalletInstanceRevoked = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(true),
    revokedAt: IsoDateFromString,
  }),
  t.partial({
    deviceDetails: DeviceDetailsRevokedWI,
    revocationReason: RevocationReason,
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
