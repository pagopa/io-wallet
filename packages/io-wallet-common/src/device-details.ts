import * as t from "io-ts";

import { JwkPublicKey } from "./jwk";

export const IosDeviceDetails = t.type({
  platform: t.literal("ios"),
});

export type IosDeviceDetails = t.TypeOf<typeof IosDeviceDetails>;

export const AndroidDeviceDetails = t.intersection([
  t.type({
    attestationSecurityLevel: t.number,
    attestationVersion: t.number,
    keymasterSecurityLevel: t.number,
    keymasterVersion: t.number,
    platform: t.literal("android"),
  }),
  t.partial({
    /** Public key of the app attest key pinned at registration, used to verify fresh key attestations. */
    attestKey: JwkPublicKey,
    bootPatchLevel: t.string,
    deviceLocked: t.boolean,
    osPatchLevel: t.number,
    osVersion: t.number,
    vendorPatchLevel: t.string,
    /** Hex encoded verified boot key of the root of trust. */
    verifiedBootKey: t.string,
    verifiedBootState: t.number,
    x509Chain: t.array(t.string),
  }),
]);

export type AndroidDeviceDetails = t.TypeOf<typeof AndroidDeviceDetails>;

export const DeviceDetails = t.union([AndroidDeviceDetails, IosDeviceDetails]);

export type DeviceDetails = t.TypeOf<typeof DeviceDetails>;

export const AndroidDeviceDetailsStringOsPatchLevel = t.intersection([
  t.type({
    attestationSecurityLevel: t.number,
    attestationVersion: t.number,
    keymasterSecurityLevel: t.number,
    keymasterVersion: t.number,
    platform: t.literal("android"),
  }),
  t.partial({
    attestKey: JwkPublicKey,
    bootPatchLevel: t.string,
    deviceLocked: t.boolean,
    osPatchLevel: t.union([t.number, t.string]),
    osVersion: t.number,
    vendorPatchLevel: t.string,
    verifiedBootKey: t.string,
    verifiedBootState: t.number,
    x509Chain: t.array(t.string),
  }),
]);

export const DeviceDetailsStringOsPatchLevel = t.union([
  AndroidDeviceDetailsStringOsPatchLevel,
  IosDeviceDetails,
]);
