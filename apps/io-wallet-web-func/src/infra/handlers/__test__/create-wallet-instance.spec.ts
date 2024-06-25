import {
  WalletInstance,
  WalletInstanceRepository,
  WalletInstanceValid,
} from "@/wallet-instance";
import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { CreateWalletInstanceHandler } from "../create-wallet-instance";

describe("CreateWalletInstanceHandler", () => {
  const walletInstance: WalletInstance = {
    createdAt: new Date(),
    hardwareKey: {
      crv: "P-256",
      kty: "EC" as const,
      x: "x" as NonEmptyString,
      y: "y" as NonEmptyString,
    },
    id: "id" as NonEmptyString,
    isRevoked: false,
    signCount: 0,
    userId: "userId" as NonEmptyString,
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    batchPatch: () => TE.right(undefined),
    getAllByUserId: () => TE.right(O.some([walletInstance])),
    getLastByUserId: () => TE.right(O.some(walletInstance)),
    insert: () => TE.right(undefined),
  };

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  it("should return a right response on success", async () => {
    const handler = CreateWalletInstanceHandler({
      input: walletInstance,
      inputDecoder: WalletInstanceValid,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: undefined,
    });
  });

  it("should return a left response on invalid input", async () => {
    const handler = CreateWalletInstanceHandler({
      input: { foo: "foo" },
      inputDecoder: WalletInstanceValid,
      logger,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual(
      expect.objectContaining({
        _tag: "Left",
      }),
    );
  });

  it("should return a left response on insertWalletInstance error", async () => {
    const walletInstanceRepositoryThatFailsOnInsert: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        getAllByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.right(O.some(walletInstance)),
        insert: () => TE.left(new Error("failed on insert!")),
      };
    const handler = CreateWalletInstanceHandler({
      input: walletInstance,
      inputDecoder: WalletInstanceValid,
      logger,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnInsert,
    });

    await expect(handler()).resolves.toEqual(
      expect.objectContaining({
        _tag: "Left",
      }),
    );
  });

  it("should return a left response on getAllByUserId error", async () => {
    const walletInstanceRepositoryThatFailsOnGetAllByUserId: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("not implemented")),
        getAllByUserId: () => TE.left(new Error("failed on getAllByUserId!")),
        getLastByUserId: () => TE.right(O.some(walletInstance)),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = CreateWalletInstanceHandler({
      input: walletInstance,
      inputDecoder: WalletInstanceValid,
      logger,
      walletInstanceRepository:
        walletInstanceRepositoryThatFailsOnGetAllByUserId,
    });

    await expect(handler()).resolves.toEqual(
      expect.objectContaining({
        _tag: "Left",
      }),
    );
  });

  it("should return a left response on batchPatch error", async () => {
    const walletInstanceRepositoryThatFailsOnBatchPatch: WalletInstanceRepository =
      {
        batchPatch: () => TE.left(new Error("failed on batchPatch!")),
        getAllByUserId: () => TE.left(new Error("not implemented")),
        getLastByUserId: () => TE.right(O.some(walletInstance)),
        insert: () => TE.left(new Error("not implemented")),
      };
    const handler = CreateWalletInstanceHandler({
      input: walletInstance,
      inputDecoder: WalletInstanceValid,
      logger,
      walletInstanceRepository: walletInstanceRepositoryThatFailsOnBatchPatch,
    });

    await expect(handler()).resolves.toEqual(
      expect.objectContaining({ _tag: "Left" }),
    );
  });
});
