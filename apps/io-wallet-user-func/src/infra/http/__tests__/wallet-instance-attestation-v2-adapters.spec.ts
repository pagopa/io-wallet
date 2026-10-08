import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it, vi } from "vitest";

import {
  createWalletInstanceAttestationV2Adapters,
  runTaskEither,
} from "../wallet-instance-attestation-v2-adapters";

describe("wallet instance attestation V2 adapters", () => {
  it("runs a lazy task exactly once and returns its value", async () => {
    const task = vi.fn(async () => E.right("value"));

    await expect(runTaskEither(task)).resolves.toBe("value");
    expect(task).toHaveBeenCalledOnce();
  });

  it("throws the original error instance from a failed task", async () => {
    const failure = new Error("repository failed");
    const task = vi.fn(async () => E.left(failure));

    await expect(runTaskEither(task)).rejects.toBe(failure);
    expect(task).toHaveBeenCalledOnce();
  });

  it("passes the status list base URL and preserves the repository binding", async () => {
    const status = { index: 0, statusListId: "status-list" as NonEmptyString };
    const adapters = createWalletInstanceAttestationV2Adapters({
      assertionValidationConfig: {} as never,
      cryptographyClient: {} as never,
      federationEntityId: { href: "https://wallet-provider.example.org" },
      keyRepository: {} as never,
      nonceRepository: {} as never,
      statusListBaseUrl: "https://status.example.org/prefix/",
      walletInstanceAttestationSigningKeyName: "key",
      walletInstanceRepository: {
        getByUserId: vi.fn(() =>
          TE.right(
            O.some({
              createdAt: new Date(),
              hardwareKey: {} as never,
              id: "instance" as NonEmptyString,
              isRevoked: false,
              signCount: 0,
              status,
              userId: "AAACCC94E17H501P" as FiscalCode,
            }),
          ),
        ),
      } as never,
    });

    expect(adapters.statusListBaseUrl).toBe(
      "https://status.example.org/prefix/",
    );
    await expect(
      adapters.getWalletInstance(
        "hardware-key" as NonEmptyString,
        "AAACCC94E17H501P" as FiscalCode,
      ),
    ).resolves.toMatchObject({ status });
  });
});
