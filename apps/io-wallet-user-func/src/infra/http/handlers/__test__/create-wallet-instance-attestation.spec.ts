/* eslint-disable max-lines-per-function */
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
import { describe, expect, it, vi } from "vitest";

import { CertificateRepository } from "@/certificates";
import {
  AssertionValidationConfig,
  verifyAndroidAssertion,
} from "@/infra/mobile-attestation-service";
import { ExternalServiceError } from "@/infra/mobile-attestation-service/android/assertion";
import { iOSMockData } from "@/infra/mobile-attestation-service/ios/__test__/config";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";

import { CreateWalletInstanceAttestationHandler } from "../create-wallet-instance-attestation";
import { privateEcKey, publicEcKey, signer } from "./keys";

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
  basePath: url("https://wallet-provider.example.org/foo/"),
  contacts: [email("foo@pec.bar.it")],
  homepageUri: url("https://wallet-provider.example.org/privacy_policy"),
  logoUri: url("https://wallet-provider.example.org/logo.svg"),
  organizationName: "wallet provider" as NonEmptyString,
  policyUri: url("https://wallet-provider.example.org/info_policy"),
  tosUri: url("https://wallet-provider.example.org/logo.svg"),
};

const walletAttestationConfig = {
  oauthClientSub: "oauthClientSub",
};

const assertionValidationConfig: AssertionValidationConfig = {
  allowedDeveloperUsers: ["a"],
  androidBundleIdentifiers: [],
  androidPlayIntegrityUrl: "",
  androidPlayStoreCertificateHash: "",
  googleAppCredentialsEncoded: "",
  iosBundleIdentifiers: [],
  iOsTeamIdentifier: "",
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
  getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
  insert: () => TE.left(new Error("not implemented")),
};

const certificateRepository: CertificateRepository = {
  getCertificateChainByKid: () => TE.right(O.some(["cert1", "cert2"])),
  insertCertificateChain: () => TE.right(undefined),
};

const data = Buffer.from(assertion, "base64");
const { authenticatorData, signature } = decode(data);

vi.mock("@/infra/mobile-attestation-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/infra/mobile-attestation-service")>();
  return {
    ...actual,
    verifyAndroidAssertion: vi.fn(() => () => TE.right(void 0)),
    verifyIosAssertion: vi.fn(() => () => TE.right(void 0)),
  };
});

describe("CreateWalletInstanceAttestationHandler", async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);

  const walletAttestationRequest = await new jose.SignJWT({
    aud: "aud",
    cnf: {
      jwk: publicEcKey,
    },
    hardware_key_tag: keyId,
    hardware_signature: signature.toString("base64"),
    integrity_assertion: authenticatorData.toString("base64"),
    iss: keyId,
    nonce: challenge,
    platform: "ios",
    sub: "https://wallet-provider.example.org/",
    wallet_solution_id: "appio",
    wallet_solution_version: "3.25.0.1",
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "wia-request+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(josePrivateKey);

  const androidWalletAttestationRequest = await new jose.SignJWT({
    aud: "aud",
    cnf: {
      jwk: publicEcKey,
    },
    hardware_key_tag: keyId,
    hardware_signature: signature.toString("base64"),
    integrity_assertion: authenticatorData.toString("base64"),
    iss: keyId,
    nonce: challenge,
    platform: "android",
    sub: "https://wallet-provider.example.org/",
    wallet_solution_id: "appio",
    wallet_solution_version: "3.25.0.1",
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "wia-request+jwt",
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

  const androidReq = {
    ...H.request("https://wallet-provider.example.org"),
    body: {
      assertion: androidWalletAttestationRequest,
      fiscal_code: mockFiscalCode,
    },
    method: "POST",
  };

  it("should return a 200 HTTP response on success", async () => {
    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          wallet_instance_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it("should return a 200 HTTP response on android request success", async () => {
    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: androidReq,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          wallet_instance_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it("should return a correctly encoded jwt on success and URLs within the token should not have trailing slashes", async () => {
    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(6);

    if (E.isRight(result)) {
      const body = t
        .type({
          wallet_instance_attestation: t.string,
        })
        .decode(result.right.body);
      if (E.isRight(body)) {
        const walletInstanceAtt = body.right.wallet_instance_attestation;
        const walletInstanceAttHeader =
          jose.decodeProtectedHeader(walletInstanceAtt);
        expect(Object.keys(walletInstanceAttHeader).sort()).toEqual(
          ["alg", "typ", "kid", "x5c"].sort(),
        );
        const walletInstanceAttPayload = jose.decodeJwt(walletInstanceAtt);
        expect(Object.keys(walletInstanceAttPayload).sort()).toEqual(
          ["cnf", "exp", "iat", "iss", "sub", "eudi_wallet_info"].sort(),
        );
        const eudiWalletInfo = t
          .type({
            general_info: t.type({
              wallet_provider_name: t.string,
            }),
          })
          .decode(walletInstanceAttPayload.eudi_wallet_info);
        expect(E.isRight(eudiWalletInfo)).toBe(true);
        if (E.isRight(eudiWalletInfo)) {
          expect(eudiWalletInfo.right.general_info.wallet_provider_name).toBe(
            walletInstanceAttPayload.iss,
          );
        }
        // check trailing slashes are removed
        expect((walletInstanceAttPayload.iss || "").endsWith("/")).toBe(false);
        expect((walletInstanceAttPayload.sub || "").endsWith("/")).toBe(false);
      }
    }
  });

  it("should return a 500 HTTP response when getCertificateChainByKid returns an error", async () => {
    const certificateRepositoryError: CertificateRepository = {
      getCertificateChainByKid: () => TE.left(new Error()),
      insertCertificateChain: () => TE.right(undefined),
    };

    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository: certificateRepositoryError,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 500,
      }),
    });
  });

  it("should return a 500 HTTP response when getCertificateChainByKid returns an O.none", async () => {
    const certificateRepositoryNone: CertificateRepository = {
      getCertificateChainByKid: () => TE.right(O.none),
      insertCertificateChain: () => TE.right(undefined),
    };

    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository: certificateRepositoryNone,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 500,
      }),
    });
  });

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion1: "foo",
      },
      method: "POST",
    };
    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
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
    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
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
    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
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

  it("should return a 500 HTTP response when verifyAndroidAssertion returns ExternalServiceError", async () => {
    vi.mocked(verifyAndroidAssertion).mockReturnValueOnce(() =>
      TE.left(new ExternalServiceError("foo")),
    );
    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: androidReq,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
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

  it("should return a 422 HTTP response when payload.iss does not match payload.hardware_key_tag", async () => {
    const invalidIssuerWalletAttestationRequest = await new jose.SignJWT({
      aud: "aud",
      cnf: {
        jwk: publicEcKey,
      },
      hardware_key_tag: keyId,
      hardware_signature: signature.toString("base64"),
      integrity_assertion: authenticatorData.toString("base64"),
      iss: "invalid-issuer",
      nonce: challenge,
      platform: "ios",
      wallet_solution_id: "appio",
      wallet_solution_version: "3.25.0.1",
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: publicEcKey.kid,
        typ: "wia-request+jwt",
      })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(josePrivateKey);

    const invalidReq = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: invalidIssuerWalletAttestationRequest,
        fiscal_code: mockFiscalCode,
      },
      method: "POST",
    };

    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: invalidReq,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
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

  it("should return a 422 HTTP response when payload.cnf.jwk.kid does not match header.kid", async () => {
    const publicEcKeyWithDifferentKid = {
      ...publicEcKey,
      kid: "different-cnf-kid",
    };
    const invalidCnfKidWalletAttestationRequest = await new jose.SignJWT({
      aud: "aud",
      cnf: {
        jwk: publicEcKeyWithDifferentKid,
      },
      hardware_key_tag: keyId,
      hardware_signature: signature.toString("base64"),
      integrity_assertion: authenticatorData.toString("base64"),
      iss: keyId,
      nonce: challenge,
      platform: "ios",
      wallet_solution_id: "appio",
      wallet_solution_version: "3.25.0.1",
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: publicEcKey.kid,
        typ: "wia-request+jwt",
      })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(josePrivateKey);

    const invalidReq = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: invalidCnfKidWalletAttestationRequest,
        fiscal_code: mockFiscalCode,
      },
      method: "POST",
    };

    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: invalidReq,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
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

  it("should return a 422 HTTP response when payload.cnf.jwk.kid is missing", async () => {
    const publicEcKeyWithoutKid = { ...publicEcKey };
    delete (publicEcKeyWithoutKid as { kid?: unknown }).kid;
    const invalidCnfKidWalletAttestationRequest = await new jose.SignJWT({
      aud: "aud",
      cnf: {
        jwk: publicEcKeyWithoutKid,
      },
      hardware_key_tag: keyId,
      hardware_signature: signature.toString("base64"),
      integrity_assertion: authenticatorData.toString("base64"),
      iss: keyId,
      nonce: challenge,
      platform: "ios",
      wallet_solution_id: "appio",
      wallet_solution_version: "3.25.0.1",
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: publicEcKey.kid,
        typ: "wia-request+jwt",
      })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(josePrivateKey);

    const invalidReq = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: invalidCnfKidWalletAttestationRequest,
        fiscal_code: mockFiscalCode,
      },
      method: "POST",
    };

    const handler = CreateWalletInstanceAttestationHandler({
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: invalidReq,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletAttestationConfig,
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
});
