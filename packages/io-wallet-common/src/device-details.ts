import * as t from "io-ts";

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
    bootPatchLevel: t.string,
    deviceLocked: t.boolean,
    osPatchLevel: t.number,
    osVersion: t.number,
    vendorPatchLevel: t.string,
    verifiedBootState: t.number,
    x509Chain: t.array(t.string),
  }),
]);

export type AndroidDeviceDetails = t.TypeOf<typeof AndroidDeviceDetails>;

export const DeviceDetails = t.union([AndroidDeviceDetails, IosDeviceDetails]);

export type DeviceDetails = t.TypeOf<typeof DeviceDetails>;

const AndroidDeviceDetailsStringOsPatchLevel = t.intersection([
  t.type({
    attestationSecurityLevel: t.number,
    attestationVersion: t.number,
    keymasterSecurityLevel: t.number,
    keymasterVersion: t.number,
    platform: t.literal("android"),
  }),
  t.partial({
    bootPatchLevel: t.string,
    deviceLocked: t.boolean,
    osPatchLevel: t.union([t.number, t.string]),
    osVersion: t.number,
    vendorPatchLevel: t.string,
    verifiedBootState: t.number,
    x509Chain: t.array(t.string),
  }),
]);

export const DeviceDetailsStringOsPatchLevel = t.union([
  AndroidDeviceDetailsStringOsPatchLevel,
  IosDeviceDetails,
]);
