import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

import {
  DeviceDetails,
  DeviceDetailsStringOsPatchLevel,
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

// Some revoked wallet instances in the database have `osPatchLevel` stored as a string,
// so we allow `osPatchLevel` to be either a number or a string for revoked instances only
const WalletInstanceRevoked = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(true),
    revokedAt: IsoDateFromString,
  }),
  t.partial({
    deviceDetails: DeviceDetailsStringOsPatchLevel,
    revocationReason: RevocationReason,
  }),
]);

export const WalletInstance = t.union([
  WalletInstanceValid,
  WalletInstanceRevoked,
]);

export type WalletInstance = t.TypeOf<typeof WalletInstance>;
