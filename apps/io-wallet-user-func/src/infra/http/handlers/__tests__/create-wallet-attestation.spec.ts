/* eslint-disable max-lines-per-function */
/* eslint-disable vitest/no-conditional-expect */
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import {
  EmailString,
  FiscalCode,
  NonEmptyString,
} from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import { decode } from "cbor-x";
import * as E from "fp-ts/Either";
import { flow } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import * as jose from "jose";
import { describe, expect, it } from "vitest";

import type { SignJwtEnvironment } from "@/infra/crypto/signer";

import { AttestationService } from "@/attestation-service";
import { ExternalServiceError } from "@/infra/mobile-attestation-service/android/assertion";
import { iOSMockData } from "@/infra/mobile-attestation-service/ios/__tests__/config";
import { KeyRepository } from "@/keys";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";

import { CreateWalletAttestationHandler } from "../create-wallet-attestation";
import { privateEcKey, publicEcKey } from "./keys";

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

const url = flow(
  UrlFromString.decode,
  E.getOrElseW((_) => {
    throw new Error(`Failed to parse url ${_[0].value}`);
  }),
);

const email = flow(
  EmailString.decode,
  E.getOrElseW((_) => {
    throw new Error(`Failed to parse url ${_[0].value}`);
  }),
);

const federationEntity = {
  basePathV10: url("https://wallet-provider-v10.example.org/foo/"),
  basePathV13: url("https://wallet-provider-v13.example.org/bar/"),
  contacts: [email("foo@pec.bar.it")],
  homepageUri: url("https://wallet-provider.example.org/privacy_policy"),
  logoUri: url("https://wallet-provider.example.org/logo.svg"),
  organizationName: "wallet provider" as NonEmptyString,
  policyUri: url("https://wallet-provider.example.org/info_policy"),
  tosUri: url("https://wallet-provider.example.org/logo.svg"),
};

const walletAttestationConfig = {
  walletLink: "https://foo.com",
  walletName: "Wallet name",
};

const walletAttestationSigningKeyName = "wallet-attestation-signing-key-name";

const keyRepository: KeyRepository = {
  getKeyByName: () =>
    TE.right(
      O.some({
        ...privateEcKey,
        certificateChain: ["cert1", "cert2"],
        keyName: walletAttestationSigningKeyName,
        kid: privateEcKey.kid,
      }),
    ),
};

const cryptographyClient: SignJwtEnvironment["cryptographyClient"] = {
  signData: (algorithm) =>
    Promise.resolve({ algorithm, result: new Uint8Array(64) }),
};

const mockAttestationService: AttestationService = {
  getHardwarePublicTestKey: () => TE.left(new Error("not implemented")),
  validateAssertion: () => TE.right(undefined),
  validateAttestation: () =>
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
  getByUserId: () =>
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
  getLastByUserId: () => TE.left(new Error("not implemented")),
  getValidByUserId: () => TE.left(new Error("not implemented")),
  getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
  insert: () => TE.left(new Error("not implemented")),
};

const data = Buffer.from(assertion, "base64");
const { authenticatorData, signature } = decode(data);

describe("CreateWalletAttestationHandler", async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);

  const walletAttestationRequest = await new jose.SignJWT({
    aud: "aud",
    cnf: {
      jwk: publicEcKey,
    },
    hardware_key_tag: keyId,
    hardware_signature: signature.toString("base64"),
    integrity_assertion: authenticatorData.toString("base64"),
    iss: "demokey",
    nonce: challenge, // TODO: rename challenge in nonce
    sub: "https://wallet-provider.example.org/",
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "wp-war+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(josePrivateKey);

  const req = {
    ...H.request("https://wallet-provider.example.org"),
    body: {
      assertion: walletAttestationRequest,
      fiscal_code: mockFiscalCode,
    },
    method: "POST",
  };

  it("should return a 200 HTTP response on success", async () => {
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      cryptographyClient,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyRepository,
      logger,
      nonceRepository,
      walletAttestationConfig,
      walletAttestationSigningKeyName,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: expect.objectContaining({
          wallet_attestations: expect.arrayContaining([
            expect.objectContaining({
              format: expect.any(String),
              wallet_attestation: expect.any(String),
            }),
          ]),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a correctly encoded jwt on success and URLs within the token should not have trailing slashes", async () => {
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      cryptographyClient,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyRepository,
      logger,
      nonceRepository,
      walletAttestationConfig,
      walletAttestationSigningKeyName,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(6);

    if (E.isRight(result)) {
      const body = t
        .type({
          wallet_attestations: t.array(
            t.type({
              format: t.literal("jwt"),
              wallet_attestation: t.string,
            }),
          ),
        })
        .decode(result.right.body);
      if (E.isRight(body)) {
        const walletAttestations = body.right.wallet_attestations;
        const walletAttestationJwt = walletAttestations.find(
          (walletAttestation) => walletAttestation.format === "jwt",
        );
        if (walletAttestationJwt) {
          const jwtHeader = jose.decodeProtectedHeader(
            walletAttestationJwt.wallet_attestation,
          );
          expect(Object.keys(jwtHeader).sort()).toEqual(
            ["alg", "typ", "kid"].sort(),
          );
          const jwtPayload = jose.decodeJwt(
            walletAttestationJwt.wallet_attestation,
          );
          expect(Object.keys(jwtPayload).sort()).toEqual(
            [
              "aal",
              "exp",
              "iat",
              "cnf",
              "iss",
              "sub",
              "wallet_name",
              "wallet_link",
            ].sort(),
          );
          expect(jwtPayload.iss).toBe(
            "https://wallet-provider-v10.example.org/foo",
          );
          expect(jwtPayload.aal).toBe(
            "https://wallet-provider-v10.example.org/foo/LoA/basic",
          );
          // check trailing slashes are removed
          expect((jwtPayload.iss || "").endsWith("/")).toBe(false);
          expect((jwtPayload.sub || "").endsWith("/")).toBe(false);
        }
      }
    }
  });

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion1: "foo",
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      cryptographyClient,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyRepository,
      logger,
      nonceRepository,
      walletAttestationConfig,
      walletAttestationSigningKeyName,
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
      ...walletInstanceRepository,
      getByUserId: () =>
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
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: walletAttestationRequest,
        fiscal_code: mockFiscalCode,
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      cryptographyClient,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyRepository,
      logger,
      nonceRepository,
      walletAttestationConfig,
      walletAttestationSigningKeyName,
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
      ...walletInstanceRepository,
      getByUserId: () => TE.right(O.none),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: walletAttestationRequest,
        fiscal_code: mockFiscalCode,
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationService,
      cryptographyClient,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyRepository,
      logger,
      nonceRepository,
      walletAttestationConfig,
      walletAttestationSigningKeyName,
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

  it("should return a 500 HTTP response when validateAssertion returns ExternalServiceError", async () => {
    const mockAttestationServiceExternalServiceError: AttestationService = {
      getHardwarePublicTestKey: () => TE.left(new Error("not implemented")),
      validateAssertion: () => TE.left(new ExternalServiceError("foo")),
      validateAttestation: () =>
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
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: walletAttestationRequest,
        fiscal_code: mockFiscalCode,
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationHandler({
      attestationService: mockAttestationServiceExternalServiceError,
      cryptographyClient,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyRepository,
      logger,
      nonceRepository,
      walletAttestationConfig,
      walletAttestationSigningKeyName,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: {
          detail: "ExternalServiceError",
          status: 500,
          title: "Internal Server Error",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 500,
      }),
    });
  });
});
