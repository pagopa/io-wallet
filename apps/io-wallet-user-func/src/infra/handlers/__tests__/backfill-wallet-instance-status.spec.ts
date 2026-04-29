/* eslint-disable vitest/no-commented-out-tests */
// import * as L from "@pagopa/logger";
// import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
// import * as E from "fp-ts/Either";
// import * as TE from "fp-ts/TaskEither";
// import * as t from "io-ts";
// import {
//   WalletInstance,
//   WalletInstanceValid,
// } from "io-wallet-common/wallet-instance";
// import { beforeEach, describe, expect, it, vi } from "vitest";

// import { CosmosNotFoundError } from "@/infra/azure/cosmos/errors";

// const telemetryMocks = vi.hoisted(() => ({
//   sendTelemetryException: vi.fn(),
//   sendTelemetryExceptionEffect: vi.fn<(_error: Error) => E.Either<Error, void>>(
//     () => E.right(undefined),
//   ),
// }));

// vi.mock("@/infra/telemetry", () => ({
//   sendTelemetryException: (properties?: Record<string, unknown>) => {
//     telemetryMocks.sendTelemetryException(properties);

//     return (error: Error) => telemetryMocks.sendTelemetryExceptionEffect(error);
//   },
// }));

// import { StatusListAllocator } from "@/status-list";
// import { addStatus } from "@/wallet-instance";
// import { WalletInstanceStatusRepository } from "@/wallet-instance-status";

// import { BackfillWalletInstanceStatusHandler } from "../backfill-wallet-instance-status";

// const mockFiscalCode = "AAACCC94E17H501P" as FiscalCode;

// const logger = {
//   format: L.format.simple,
//   log: () => () => void 0,
// };

// const allocateStatusToWalletInstanceMock = vi.fn();
// const revokeWalletInstanceStatusMock = vi.fn();
// const saveWalletInstanceStatusMock = vi.fn();

// const statusListAllocator: StatusListAllocator = {
//   get allocateStatusBinding() {
//     return allocateStatusToWalletInstanceMock();
//   },
// };

// const walletInstanceStatusRepository: WalletInstanceStatusRepository = {
//   revoke: revokeWalletInstanceStatusMock,
//   save: saveWalletInstanceStatusMock,
// };

// const makeWalletInstance = (): WalletInstanceValid => ({
//   createdAt: new Date(),
//   hardwareKey: {
//     crv: "P-256",
//     kid: "ea693e3c-e8f6-436c-ac78-afdf9956eecb",
//     kty: "EC",
//     x: "01m0xf5ujQ5g22FvZ2zbFrvyLx9bgN2AiLVFtca2BUE",
//     y: "7ZIKVr_WCQgyLOpTysVUrBKJz1LzjNlK3DD4KdOGHjo",
//   },
//   id: "wallet-instance-id" as NonEmptyString,
//   isRevoked: false,
//   signCount: 0,
//   userId: mockFiscalCode,
// });

// const invokeHandler = (documents: readonly unknown[]) =>
//   BackfillWalletInstanceStatusHandler({
//     input: documents,
//     inputDecoder: t.array(t.unknown),
//     logger,
//     statusListAllocator,
//     walletInstanceStatusRepository,
//   })();

// const resetMocks = () => {
//   telemetryMocks.sendTelemetryException.mockClear();
//   telemetryMocks.sendTelemetryExceptionEffect.mockClear();
//   allocateStatusToWalletInstanceMock.mockReset();
//   revokeWalletInstanceStatusMock.mockReset();
//   saveWalletInstanceStatusMock.mockReset();

//   allocateStatusToWalletInstanceMock.mockReturnValue(
//     TE.right({
//       index: 100,
//       statusListId: "status-list-a" as NonEmptyString,
//     }),
//   );
//   revokeWalletInstanceStatusMock.mockReturnValue(TE.right(undefined));
//   saveWalletInstanceStatusMock.mockReturnValue(TE.right(undefined));
// };

// describe("BackfillWalletInstanceStatusHandler success paths", () => {
//   beforeEach(() => {
//     resetMocks();
//   });

//   it("allocates and projects active wallet instances without a status", async () => {
//     const walletInstance = makeWalletInstance();
//     const enrichedWalletInstance = addStatus(walletInstance, {
//       index: 100,
//       statusListId: "status-list-a" as NonEmptyString,
//     });

//     await expect(invokeHandler([walletInstance])).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [],
//       },
//     });

//     expect(allocateStatusToWalletInstanceMock).toHaveBeenCalledTimes(1);
//     expect(revokeWalletInstanceStatusMock).not.toHaveBeenCalled();
//     expect(saveWalletInstanceStatusMock).toHaveBeenCalledWith(
//       enrichedWalletInstance,
//     );
//   });

//   it("passes through wallet instances that already contain a status without allocating", async () => {
//     const walletInstance = addStatus(makeWalletInstance(), {
//       index: 7,
//       statusListId: "status-list-a" as NonEmptyString,
//     });

//     await expect(invokeHandler([walletInstance])).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [],
//       },
//     });

//     expect(allocateStatusToWalletInstanceMock).not.toHaveBeenCalled();
//     expect(revokeWalletInstanceStatusMock).not.toHaveBeenCalled();
//     expect(saveWalletInstanceStatusMock).toHaveBeenCalledWith(walletInstance);
//     expect(telemetryMocks.sendTelemetryExceptionEffect).not.toHaveBeenCalled();
//   });

//   it("patches revocation fields without allocating or upserting", async () => {
//     const revokedWalletInstance: WalletInstance = {
//       ...makeWalletInstance(),
//       isRevoked: true,
//       revokedAt: new Date(),
//     };

//     await expect(invokeHandler([revokedWalletInstance])).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [],
//       },
//     });

//     expect(allocateStatusToWalletInstanceMock).not.toHaveBeenCalled();
//     expect(revokeWalletInstanceStatusMock).toHaveBeenCalledWith(
//       revokedWalletInstance,
//     );
//     expect(saveWalletInstanceStatusMock).not.toHaveBeenCalled();
//     expect(telemetryMocks.sendTelemetryExceptionEffect).not.toHaveBeenCalled();
//   });

//   it("saves revoked wallet instances when the target document does not exist yet", async () => {
//     const revokedWalletInstance: WalletInstance = {
//       ...makeWalletInstance(),
//       isRevoked: true,
//       revokedAt: new Date(),
//     };

//     revokeWalletInstanceStatusMock.mockReturnValueOnce(
//       TE.left(
//         new CosmosNotFoundError(
//           "Error revoking wallet instance status document",
//         ),
//       ),
//     );

//     await expect(invokeHandler([revokedWalletInstance])).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [],
//       },
//     });

//     expect(allocateStatusToWalletInstanceMock).not.toHaveBeenCalled();
//     expect(revokeWalletInstanceStatusMock).toHaveBeenCalledWith(
//       revokedWalletInstance,
//     );
//     expect(saveWalletInstanceStatusMock).toHaveBeenCalledWith(
//       revokedWalletInstance,
//     );
//     expect(telemetryMocks.sendTelemetryExceptionEffect).not.toHaveBeenCalled();
//   });
// });

// describe("BackfillWalletInstanceStatusHandler failure handling", () => {
//   beforeEach(() => {
//     resetMocks();
//   });

//   it("reports poison documents and continues with the remaining batch", async () => {
//     const validWalletInstance = makeWalletInstance();
//     const enrichedWalletInstance = addStatus(validWalletInstance, {
//       index: 100,
//       statusListId: "status-list-a" as NonEmptyString,
//     });

//     await expect(
//       invokeHandler([{ invalid: true }, validWalletInstance]),
//     ).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [expect.any(Object)],
//       },
//     });

//     expect(telemetryMocks.sendTelemetryExceptionEffect).toHaveBeenCalledTimes(
//       1,
//     );
//     expect(allocateStatusToWalletInstanceMock).toHaveBeenCalledTimes(1);
//     expect(revokeWalletInstanceStatusMock).not.toHaveBeenCalled();
//     expect(saveWalletInstanceStatusMock).toHaveBeenCalledWith(
//       enrichedWalletInstance,
//     );
//     expect(
//       allocateStatusToWalletInstanceMock.mock.invocationCallOrder[0],
//     ).toBeLessThan(
//       telemetryMocks.sendTelemetryExceptionEffect.mock.invocationCallOrder[0],
//     );
//   });

//   it("reports enrichment errors at the end and still succeeds", async () => {
//     const failingWalletInstance = makeWalletInstance();
//     const succeedingWalletInstance: WalletInstance = {
//       ...makeWalletInstance(),
//       id: "wallet-instance-id-2" as NonEmptyString,
//     };
//     const enrichedWalletInstance = addStatus(succeedingWalletInstance, {
//       index: 100,
//       statusListId: "status-list-a" as NonEmptyString,
//     });

//     allocateStatusToWalletInstanceMock
//       .mockReturnValueOnce(TE.left(new Error("allocation failed")))
//       .mockReturnValueOnce(
//         TE.right({
//           index: 100,
//           statusListId: "status-list-a" as NonEmptyString,
//         }),
//       );

//     await expect(
//       invokeHandler([failingWalletInstance, succeedingWalletInstance]),
//     ).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [expect.any(Object)],
//       },
//     });

//     expect(telemetryMocks.sendTelemetryException).toHaveBeenCalledWith(
//       expect.objectContaining({
//         failedDocumentCount: 1,
//         failedFiscalCodes: JSON.stringify([mockFiscalCode]),
//         failedWalletInstanceIds: JSON.stringify([failingWalletInstance.id]),
//         functionName: "backfillWalletInstanceStatus",
//       }),
//     );
//     expect(telemetryMocks.sendTelemetryExceptionEffect).toHaveBeenCalledTimes(
//       1,
//     );
//     expect(revokeWalletInstanceStatusMock).not.toHaveBeenCalled();
//     expect(saveWalletInstanceStatusMock).toHaveBeenCalledWith(
//       enrichedWalletInstance,
//     );
//   });

//   it("aggregates multiple failures into a single telemetry emission", async () => {
//     allocateStatusToWalletInstanceMock.mockReturnValueOnce(
//       TE.left(new Error("allocation failed")),
//     );

//     await expect(
//       invokeHandler([{ invalid: true }, makeWalletInstance()]),
//     ).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [expect.any(Object), expect.any(Object)],
//       },
//     });

//     expect(telemetryMocks.sendTelemetryExceptionEffect).toHaveBeenCalledTimes(
//       1,
//     );
//   });

//   it("reports persistence errors at the end and still succeeds", async () => {
//     const walletInstance = makeWalletInstance();
//     const enrichedWalletInstance = addStatus(walletInstance, {
//       index: 100,
//       statusListId: "status-list-a" as NonEmptyString,
//     });

//     saveWalletInstanceStatusMock.mockReturnValueOnce(
//       TE.left(new Error("write failed")),
//     );

//     await expect(invokeHandler([walletInstance])).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [expect.any(Object)],
//       },
//     });

//     expect(saveWalletInstanceStatusMock).toHaveBeenCalledWith(
//       enrichedWalletInstance,
//     );
//     expect(telemetryMocks.sendTelemetryExceptionEffect).toHaveBeenCalledTimes(
//       1,
//     );
//   });

//   it("reports revocation patch errors at the end and still succeeds", async () => {
//     const revokedWalletInstance: WalletInstance = {
//       ...makeWalletInstance(),
//       isRevoked: true,
//       revokedAt: new Date(),
//     };

//     revokeWalletInstanceStatusMock.mockReturnValueOnce(
//       TE.left(new Error("patch failed")),
//     );

//     await expect(invokeHandler([revokedWalletInstance])).resolves.toEqual({
//       _tag: "Right",
//       right: {
//         failedResults: [expect.any(Object)],
//       },
//     });

//     expect(revokeWalletInstanceStatusMock).toHaveBeenCalledWith(
//       revokedWalletInstance,
//     );
//     expect(saveWalletInstanceStatusMock).not.toHaveBeenCalled();
//     expect(telemetryMocks.sendTelemetryExceptionEffect).toHaveBeenCalledTimes(
//       1,
//     );
//   });
// });
