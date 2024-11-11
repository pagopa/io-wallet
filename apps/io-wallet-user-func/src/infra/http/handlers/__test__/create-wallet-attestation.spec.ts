/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-lines-per-function */
import {
  AttestationService,
  ValidateAssertionRequest,
} from "@/attestation-service";
import { MobileAttestationService } from "@/infra/attestation-service";
import { iOSMockData } from "@/infra/attestation-service/ios/__test__/config";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";
import { GRANT_TYPE_KEY_ATTESTATION } from "@/wallet-provider";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as appInsights from "applicationinsights";
import { decode } from "cbor-x";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import * as jose from "jose";
import { describe, expect, it } from "vitest";

import { CreateWalletAttestationHandler } from "../create-wallet-attestation";
import { privateEcKey, publicEcKey, signer } from "./keys";
import { federationEntityMetadata } from "./trust-anchor";

const { assertion, challenge, hardwareKey, keyId } = iOSMockData;

const mockFiscalCode = "AAACCC94E17H501P" as FiscalCode;

const nonceRepository: NonceRepository = {
  delete: () => TE.right(void 0),
  insert: () => TE.left(new Error("not implemented")),
};

const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

const mockAttestationService: AttestationService = {
  getHardwarePublicTestKey: () => TE.left(new Error("not implemented")),
  validateAssertion: (request: ValidateAssertionRequest) => TE.right(undefined),
  validateAttestation: (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString,
    user: FiscalCode,
  ) =>
    TE.right({
      deviceDetails: { platform: "ios" },
      hardwareKey: {
        crv: "P-256",
        kid: "ea693e3c-e8f6-436c-ac78-afdf9956eecb",
        kty: "EC",
        x: "01m0xf5ujQ5g22FvZ2zbFrvyLx9bgN2AiLVFtca2BUE",
        y: "7ZIKVr_WCQgyLOpTysVUrBKJz1LzjNlK3DD4KdOGHjo",
      },
    }),
};

const walletInstanceRepository: WalletInstanceRepository = {
  batchPatch: () => TE.left(new Error("not implemented")),
  get: () =>
    TE.right(
      O.some({
        createdAt: new Date(),
        hardwareKey,
        id: "123" as NonEmptyString,
        isRevoked: false,
        signCount: 0,
        userId: mockFiscalCode,
      }),
    ),
  getAllByUserId: () => TE.left(new Error("not implemented")),
  getLastByUserId: () => TE.left(new Error("not implemented")),
  insert: () => TE.left(new Error("not implemented")),
};

const data = Buffer.from(assertion, "base64");
const { authenticatorData, signature } = decode(data);

const telemetryClient: appInsights.TelemetryClient = {
  trackException: () => void 0,
} as unknown as appInsights.TelemetryClient;

describe("CreateWalletAttestationHandler", async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);
  const walletAttestationRequest = await new jose.SignJWT({
    challenge,
    cnf: {
      jwk: publicEcKey,
    },
    hardware_key_tag: keyId,
    hardware_signature: signature.toString("base64"),
    integrity_assertion: authenticatorData.toString("base64"),
    iss: "demokey",
    sub: "https://wallet-provider.example.org/",
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "war+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(josePrivateKey);

  it("should return a 200 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: walletAttestationRequest,
        fiscal_code: "AAACCC94E17H501P",
        grant_type: GRANT_TYPE_KEY_ATTESTATION,
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      federationEntityMetadata,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(3);
    expect(result).toEqual({
      _tag: "Right",
      right: {
        body: expect.objectContaining({
          wallet_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });

    // check trailing slashes are removed
    if (E.isRight(result)) {
      const body = result.right.body;
      const walletAttestation = body.wallet_attestation;
      if (typeof walletAttestation === "string") {
        const decoded = jose.decodeJwt(walletAttestation);
        expect((decoded.iss || "").endsWith("/")).toBe(false);
        expect((decoded.sub || "").endsWith("/")).toBe(false);
      }
    }
  });

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: walletAttestationRequest,
        grant_type: "foo",
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      federationEntityMetadata,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 422,
      }),
    });
  });

  it("should return a 403 HTTP response when the wallet instance is revoked", async () => {
    const walletInstanceRepositoryWithRevokedWI: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("not implemented")),
      get: () =>
        TE.right(
          O.some({
            createdAt: new Date(),
            hardwareKey,
            id: "123" as NonEmptyString,
            isRevoked: true,
            revokedAt: new Date(),
            signCount: 0,
            userId: mockFiscalCode,
          }),
        ),
      getAllByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: walletAttestationRequest,
        fiscal_code: "AAACCC94E17H501P",
        grant_type: GRANT_TYPE_KEY_ATTESTATION,
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      federationEntityMetadata,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryWithRevokedWI,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: {
          detail: "The wallet instance has been revoked.",
          status: 403,
          title: "Forbidden",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 403,
      }),
    });
  });

  it("should return a 404 HTTP response when the wallet instance is not found", async () => {
    const walletInstanceRepositoryWithNotFoundWI: WalletInstanceRepository = {
      batchPatch: () => TE.left(new Error("not implemented")),
      get: () => TE.right(O.none),
      getAllByUserId: () => TE.left(new Error("not implemented")),
      getLastByUserId: () => TE.left(new Error("not implemented")),
      insert: () => TE.left(new Error("not implemented")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: walletAttestationRequest,
        fiscal_code: "AAACCC94E17H501P",
        grant_type: GRANT_TYPE_KEY_ATTESTATION,
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      federationEntityMetadata,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
      walletInstanceRepository: walletInstanceRepositoryWithNotFoundWI,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: {
          detail: "Wallet instance not found",
          status: 404,
          title: "Not Found",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 404,
      }),
    });
  });
});
