import { WalletInstanceRepository } from "@/wallet-instance";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { GetCurrentWalletInstanceStatusHandler } from "../get-current-wallet-instance-status";

describe("GetCurrentWalletInstanceStatusHandler", () => {
  const hardwareKey = {
    crv: "P-256",
    kty: "EC",
    x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
    y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
  } as const;

  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const walletInstanceRepository: WalletInstanceRepository = {
    getAllByUserId: () =>
      TE.right([
        {
          createdAt: new Date(),
          hardwareKey,
          id: "123" as NonEmptyString,
          isRevoked: false,
          signCount: 0,
          userId: "123" as NonEmptyString,
        },
      ]),
  };

  const handler = GetCurrentWalletInstanceStatusHandler({
    input: H.request("https://api.test.it/"),
    inputDecoder: H.HttpRequest,
    logger,
    walletInstanceRepository,
  });

  it("should return a 200 HTTP response on success", async () => {
    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          id: "123",
          is_revoked: false,
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });
});
