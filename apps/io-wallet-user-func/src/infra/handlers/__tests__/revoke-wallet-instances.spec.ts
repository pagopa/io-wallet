import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/infra/telemetry", () => ({
  sendTelemetryException: vi.fn(() => () => E.right(undefined)),
}));

import { RevokeWalletInstancesHandler } from "../revoke-wallet-instances";

const statusListId = "status-list-1" as NonEmptyString;
const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

const revokeBits = vi.fn().mockReturnValue(TE.right(undefined));

describe("RevokeWalletInstancesHandler", () => {
  beforeEach(() => revokeBits.mockClear());

  it("filters invalid documents and forwards only revoked status bindings to the bit revocation service", async () => {
    const result = await RevokeWalletInstancesHandler({
      input: [
        {
          isRevoked: true,
          status: {
            index: 12,
            statusListId,
          },
        },
        {
          isRevoked: true,
          status: {
            index: 4096,
            statusListId,
          },
        },
        {
          isRevoked: false,
          status: {
            index: 20,
            statusListId,
          },
        },
        {
          isRevoked: true,
        },
        "invalid-document",
      ],
      inputDecoder: t.array(t.unknown),
      logger,
      statusListBitRevocation: {
        revokeBits,
      },
    })();

    expect(revokeBits).toHaveBeenCalledWith([
      {
        index: 12,
        statusListId,
      },
      {
        index: 4096,
        statusListId,
      },
    ]);
    expect(E.isRight(result)).toBe(true);
  });

  it("does not call the bit revocation service when the batch has no revoked status bindings", async () => {
    const result = await RevokeWalletInstancesHandler({
      input: [
        {
          isRevoked: false,
          status: {
            index: 12,
            statusListId,
          },
        },
        {
          id: "foo",
        },
      ],
      inputDecoder: t.array(t.unknown),
      logger,
      statusListBitRevocation: {
        revokeBits,
      },
    })();

    expect(revokeBits).not.toHaveBeenCalled();
    expect(E.isRight(result)).toBe(true);
  });
});
