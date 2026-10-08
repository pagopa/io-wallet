import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import * as jose from "jose";
import { createPrivateKey, sign as signData } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { createWalletInstanceAttestationV2Adapters } from "@/infra/http/wallet-instance-attestation-v2-adapters";
import { AssertionValidationConfig } from "@/infra/mobile-attestation-service";

import {
  privateEcKey,
  publicEcKey,
} from "../../../http/handlers/__tests__/keys";
import { CreateWalletInstanceAttestationV2Function } from "../create-wallet-instance-attestation-v2";

describe("CreateWalletInstanceAttestationV2Function", () => {
  it("passes malformed JSON to body validation and returns Problem JSON", async () => {
    const parseRequest = vi.fn(async (body: unknown) => {
      expect(body).toBeUndefined();
      throw new H.ValidationError(["invalid body"]);
    });
    const dependencies = {
      parseRequest,
      sendTelemetry: vi.fn(async () => void 0),
    };
    const context = { error: vi.fn() };
    const request = {
      json: vi.fn(async () => Promise.reject(new Error("bad json"))),
    };
    const handler = CreateWalletInstanceAttestationV2Function(
      dependencies as never,
    );

    const response = await handler(request as never, context as never);

    expect(parseRequest).toHaveBeenCalledOnce();
    expect(response.status).toBe(422);
    expect(response.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/problem+json" }),
    );
    expect(response.jsonBody).toEqual(
      expect.objectContaining({
        type: "/problem/validation-error",
        violations: ["invalid body"],
      }),
    );
    expect(context.error).toHaveBeenCalledOnce();
  });

  it("returns the telemetry failure as a 500 Problem JSON response", async () => {
    const dependencies = {
      parseRequest: vi.fn(async () => {
        throw new Error("stop");
      }),
      sendTelemetry: vi.fn(async () => {
        throw new Error("telemetry");
      }),
    };
    const context = { error: vi.fn() };
    const handler = CreateWalletInstanceAttestationV2Function(
      dependencies as never,
    );

    const response = await handler(
      { json: async () => ({}) } as never,
      context as never,
    );

    expect(response.status).toBe(500);
    expect(response.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/problem+json" }),
    );
  });

  it("serializes client_status into a JWT signed by the real V2 adapters", async () => {
    const keyName = "wallet-instance-key";
    const status = {
      index: 0,
      statusListId: "42" as NonEmptyString,
    };
    const signingKey = createPrivateKey({
      format: "jwk",
      key: privateEcKey,
    });
    const adapters = createWalletInstanceAttestationV2Adapters({
      assertionValidationConfig: {} as AssertionValidationConfig,
      cryptographyClient: {
        signData: async (
          algorithm: "ES256" | "ES384" | "ES512",
          data: Uint8Array,
        ) => ({
          algorithm,
          result: signData("sha256", data, {
            dsaEncoding: "ieee-p1363",
            key: signingKey,
          }),
        }),
      } as never,
      federationEntityId: { href: "https://wallet-provider.example.org/" },
      keyRepository: {
        getKeyByName: () =>
          TE.right(
            O.some({
              ...publicEcKey,
              certificateChain: ["certificate"],
              keyName,
            }),
          ),
      },
      nonceRepository: { delete: () => TE.right(void 0) } as never,
      statusListBaseUrl:
        "https://revocation.example.org/prefix/wia-statuslists",
      walletInstanceAttestationSigningKeyName: keyName,
      walletInstanceRepository: {
        getByUserId: () =>
          TE.right(
            O.some({
              createdAt: new Date(),
              hardwareKey: publicEcKey,
              id: "instance" as NonEmptyString,
              isRevoked: false,
              signCount: 0,
              status,
              userId: "LVTEST00A00F000X" as FiscalCode,
            }),
          ),
      } as never,
    });
    const assertionKey = await jose.importJWK(privateEcKey);
    const assertion = await new jose.SignJWT({
      cnf: { jwk: publicEcKey },
      exp: Math.floor(Date.now() / 1000) + 3600,
      hardware_key_tag: "hardware-key",
      hardware_signature: "signature",
      iat: Math.floor(Date.now() / 1000),
      integrity_assertion: "integrity",
      iss: "hardware-key",
      nonce: "nonce",
      platform: "ios",
      wallet_solution_id: "appio",
      wallet_solution_version: "1.0.0",
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: publicEcKey.kid,
        typ: "wia-request+jwt",
      })
      .sign(assertionKey);
    const context = { error: vi.fn() };
    const handler = CreateWalletInstanceAttestationV2Function(adapters);

    const response = await handler(
      {
        json: async () => ({
          assertion,
          fiscal_code: "LVTEST00A00F000X",
        }),
      } as never,
      context as never,
    );

    expect(response.status).toBe(200);
    const body = response.jsonBody as { wallet_instance_attestation: string };
    expect(jose.decodeJwt(body.wallet_instance_attestation)).toMatchObject({
      client_status: {
        status: {
          status_list: {
            idx: 0,
            uri: "https://revocation.example.org/prefix/wia-statuslists/42",
          },
        },
      },
    });
    expect(context.error).not.toHaveBeenCalled();
  });
});
