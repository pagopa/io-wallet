/* eslint-disable vitest/no-commented-out-tests */
// import type { Database } from "@azure/cosmos";

// import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
// import { WalletInstanceRevoked } from "io-wallet-common/wallet-instance";
// import { describe, expect, it, vi } from "vitest";

// import { CosmosNotFoundError } from "@/infra/azure/cosmos/errors";

// import { CosmosDbWalletInstanceStatusRepository } from "../wallet-instance-status";

// const makeRevokedWalletInstance = (
//   overrides: Partial<WalletInstanceRevoked> = {},
// ): WalletInstanceRevoked => ({
//   createdAt: new Date("2024-01-01T00:00:00.000Z"),
//   hardwareKey: {
//     crv: "P-256",
//     kid: "ea693e3c-e8f6-436c-ac78-afdf9956eecb",
//     kty: "EC",
//     x: "01m0xf5ujQ5g22FvZ2zbFrvyLx9bgN2AiLVFtca2BUE",
//     y: "7ZIKVr_WCQgyLOpTysVUrBKJz1LzjNlK3DD4KdOGHjo",
//   },
//   id: "wallet-instance-id" as NonEmptyString,
//   isRevoked: true,
//   revokedAt: new Date("2024-02-01T00:00:00.000Z"),
//   signCount: 0,
//   userId: "AAACCC94E17H501P" as FiscalCode,
//   ...overrides,
// });

// describe("CosmosDbWalletInstanceStatusRepository", () => {
//   it("saves wallet instance status documents using an upsert write", async () => {
//     const createdAt = new Date();
//     const upsert = vi.fn().mockResolvedValue(undefined);

//     const database = {
//       container: () => ({
//         items: {
//           upsert,
//         },
//       }),
//     } as unknown as Database;

//     const repository = new CosmosDbWalletInstanceStatusRepository(database);

//     await expect(
//       repository.save({
//         createdAt,
//         deviceDetails: {
//           attestationSecurityLevel: 1,
//           attestationVersion: 2,
//           deviceLocked: true,
//           keymasterSecurityLevel: 3,
//           keymasterVersion: 4,
//           osPatchLevel: 202504,
//           osVersion: 15,
//           platform: "android",
//           verifiedBootState: 0,
//           x509Chain: ["certificate"],
//         },
//         hardwareKey: {
//           crv: "P-256",
//           kid: "ea693e3c-e8f6-436c-ac78-afdf9956eecb",
//           kty: "EC",
//           x: "01m0xf5ujQ5g22FvZ2zbFrvyLx9bgN2AiLVFtca2BUE",
//           y: "7ZIKVr_WCQgyLOpTysVUrBKJz1LzjNlK3DD4KdOGHjo",
//         },
//         id: "wallet-instance-id" as NonEmptyString,
//         isRevoked: false,
//         signCount: 0,
//         status: {
//           index: 7,
//           statusListId: "status-list-a" as NonEmptyString,
//         },
//         userId: "AAACCC94E17H501P" as FiscalCode,
//       })(),
//     ).resolves.toEqual({
//       _tag: "Right",
//       right: undefined,
//     });

//     expect(upsert).toHaveBeenCalledWith({
//       createdAt,
//       deviceDetails: {
//         attestationSecurityLevel: 1,
//         attestationVersion: 2,
//         deviceLocked: true,
//         keymasterSecurityLevel: 3,
//         keymasterVersion: 4,
//         osPatchLevel: 202504,
//         osVersion: 15,
//         platform: "android",
//         verifiedBootState: 0,
//         x509Chain: ["certificate"],
//       },
//       hardwareKey: {
//         crv: "P-256",
//         kid: "ea693e3c-e8f6-436c-ac78-afdf9956eecb",
//         kty: "EC",
//         x: "01m0xf5ujQ5g22FvZ2zbFrvyLx9bgN2AiLVFtca2BUE",
//         y: "7ZIKVr_WCQgyLOpTysVUrBKJz1LzjNlK3DD4KdOGHjo",
//       },
//       id: "wallet-instance-id",
//       isRevoked: false,
//       signCount: 0,
//       status: {
//         index: 7,
//         statusListId: "status-list-a",
//       },
//       userId: "AAACCC94E17H501P",
//     });
//   });

//   it("patches only revocation fields", async () => {
//     const revokedAt = new Date();
//     const patch = vi.fn().mockResolvedValue(undefined);
//     const item = vi.fn().mockReturnValue({ patch });

//     const database = {
//       container: () => ({
//         item,
//       }),
//     } as unknown as Database;

//     const repository = new CosmosDbWalletInstanceStatusRepository(database);
//     const walletInstance = makeRevokedWalletInstance({ revokedAt });

//     await expect(repository.revoke(walletInstance)()).resolves.toEqual({
//       _tag: "Right",
//       right: undefined,
//     });

//     expect(item).toHaveBeenCalledWith("wallet-instance-id", "AAACCC94E17H501P");
//     expect(patch).toHaveBeenCalledWith([
//       {
//         op: "set",
//         path: "/isRevoked",
//         value: true,
//       },
//       {
//         op: "set",
//         path: "/revokedAt",
//         value: revokedAt,
//       },
//     ]);
//   });

//   it("maps a missing target document during revoke to a CosmosNotFoundError", async () => {
//     const patch = vi.fn().mockRejectedValue(
//       Object.assign(new Error("not found"), {
//         code: 404,
//       }),
//     );
//     const item = vi.fn().mockReturnValue({ patch });

//     const database = {
//       container: () => ({
//         item,
//       }),
//     } as unknown as Database;

//     const repository = new CosmosDbWalletInstanceStatusRepository(database);

//     await expect(
//       repository.revoke(makeRevokedWalletInstance())(),
//     ).resolves.toEqual({
//       _tag: "Left",
//       left: new CosmosNotFoundError(
//         "Error revoking wallet instance status document",
//       ),
//     });
//   });
// });
