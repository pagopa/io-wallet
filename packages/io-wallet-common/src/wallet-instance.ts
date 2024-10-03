import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

import { DeviceDetails } from "./device-details";
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

const WalletInstanceValid = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(false),
  }),
]);

export type WalletInstanceValid = t.TypeOf<typeof WalletInstanceValid>;

const WalletInstanceRevoked = t.intersection([
  WalletInstanceBase,
  t.type({
    isRevoked: t.literal(true),
    revokedAt: IsoDateFromString,
  }),
]);

export const WalletInstance = t.union([
  WalletInstanceValid,
  WalletInstanceRevoked,
]);

export type WalletInstance = t.TypeOf<typeof WalletInstance>;
