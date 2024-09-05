import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

import { DeviceDetails } from "./device-details";
import { JwkPublicKey } from "./jwk";
import { User } from "./user";

const WalletInstanceBase = t.intersection([
  t.type({
    createdAt: IsoDateFromString,
    hardwareKey: JwkPublicKey,
    id: NonEmptyString,
    signCount: t.number,
    userId: User.props.id,
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
