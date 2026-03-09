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
import * as jose from "jose";
import { describe, expect, it, vi } from "vitest";

import { CertificateRepository } from "@/certificates";
import {
  AndroidAttestationValidationConfig,
  AssertionValidationConfig,
  IntegrityCheckError,
  verifyAndroidAssertion,
  verifyAndroidAttestation,
} from "@/infra/mobile-attestation-service";
import { iOSMockData } from "@/infra/mobile-attestation-service/ios/__test__/config";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";

import { CreateWalletUnitAttestationHandler } from "../create-wallet-unit-attestation";
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

const assertionValidationConfig: AssertionValidationConfig = {
  allowedDeveloperUsers: ["a"],
  androidBundleIdentifiers: [],
  androidPlayIntegrityUrl: "",
  androidPlayStoreCertificateHash: "",
  googleAppCredentialsEncoded: "",
  iosBundleIdentifiers: [],
  iOsTeamIdentifier: "",
};

const androidAttestationValidationConfig: AndroidAttestationValidationConfig = {
  androidBundleIdentifiers: ["a"],
  androidCrlUrl: "",
  googlePublicKeys: [""],
  httpRequestTimeout: 1,
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
    verifyAndroidAttestation: vi.fn(
      () => () =>
        TE.right({
          deviceDetails: {
            attestationSecurityLevel: 2,
            attestationVersion: 3,
            keymasterSecurityLevel: 2,
            keymasterVersion: 4,
            platform: "android",
          },
          jwk: publicEcKey,
        }),
    ),
    verifyIosAssertion: vi.fn(() => () => TE.right(void 0)),
  };
});

describe("CreateWalletUnitAttestationHandler", async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);

  const keyToAttestJwtIos = await new jose.SignJWT({
    cnf: {
      jwk: publicEcKey,
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    wscd_key_attestation: {
      storage_type: "LOCAL_NATIVE",
    },
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "key-attestation-request+jwt",
    })
    .sign(josePrivateKey);

  const walletUnitAttestationRequestIos = await new jose.SignJWT({
    aud: "aud",
    cnf: {
      jwk: publicEcKey,
    },
    hardware_key_tag: keyId,
    hardware_signature: signature.toString("base64"),
    integrity_assertion: authenticatorData.toString("base64"),
    iss: keyId,
    keys_to_attest: [keyToAttestJwtIos],
    nonce: challenge,
    platform: "iOS",
    sub: "https://wallet-provider.example.org/",
    wallet_solution_id: "appio",
    wallet_solution_version: "3.25.0.1",
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "wua-request+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(josePrivateKey);

  const keyToAttestJwtAndroid = await new jose.SignJWT({
    cnf: {
      jwk: publicEcKey,
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    wscd_key_attestation: {
      attestation: "base64_attestation",
      storage_type: "LOCAL_NATIVE",
    },
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "key-attestation-request+jwt",
    })
    .sign(josePrivateKey);

  const walletUnitAttestationRequestAndroid = await new jose.SignJWT({
    aud: "aud",
    cnf: {
      jwk: publicEcKey,
    },
    hardware_key_tag: keyId,
    hardware_signature: signature.toString("base64"),
    integrity_assertion: authenticatorData.toString("base64"),
    iss: keyId,
    keys_to_attest: [keyToAttestJwtAndroid],
    nonce: challenge,
    platform: "Android",
    sub: "https://wallet-provider.example.org/",
    wallet_solution_id: "appio",
    wallet_solution_version: "3.25.0.1",
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "wua-request+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(josePrivateKey);

  const req = {
    ...H.request("https://wallet-provider.example.org"),
    body: {
      assertion: walletUnitAttestationRequestIos,
      fiscal_code: mockFiscalCode,
    },
    method: "POST",
  };

  it.skip("should return a 200 HTTP response on success if is a test user", async () => {
    const handler = CreateWalletUnitAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: walletUnitAttestationRequestIos,
          fiscal_code: "LVTEST00A00H501P",
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          wallet_unit_attestation: "this_is_a_test_wallet_unit_attestation",
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it.skip("should return a 200 HTTP response on success with iOS platform", async () => {
    const handler = CreateWalletUnitAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          wallet_unit_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it.skip("should return a 200 HTTP response on success with Android platform", async () => {
    const handler = CreateWalletUnitAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: walletUnitAttestationRequestAndroid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          wallet_unit_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it.skip("should return a 409 HTTP response with Android platform when verifyAndroidAttestation fails", async () => {
    vi.mocked(verifyAndroidAssertion).mockReturnValueOnce(() =>
      TE.left(new IntegrityCheckError(["foo"])),
    );
    const handler = CreateWalletUnitAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: walletUnitAttestationRequestAndroid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 409,
      }),
    });
  });

  it("should return 422 when platform is Android and key attestation is missing", async () => {
    const keyToAttestJwtAndroidWithoutAttestation = await new jose.SignJWT({
      cnf: {
        jwk: publicEcKey,
      },
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      wscd_key_attestation: {
        storage_type: "LOCAL_NATIVE",
      },
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: publicEcKey.kid,
        typ: "key-attestation-request+jwt",
      })
      .sign(josePrivateKey);

    const walletUnitAttestationRequestAndroidWithoutAttestation =
      await new jose.SignJWT({
        aud: "aud",
        cnf: {
          jwk: publicEcKey,
        },
        hardware_key_tag: keyId,
        hardware_signature: signature.toString("base64"),
        integrity_assertion: authenticatorData.toString("base64"),
        iss: keyId,
        keys_to_attest: [keyToAttestJwtAndroidWithoutAttestation],
        nonce: challenge,
        platform: "Android",
        wallet_solution_id: "appio",
        wallet_solution_version: "3.25.0.1",
      })
        .setProtectedHeader({
          alg: "ES256",
          kid: publicEcKey.kid,
          typ: "wua-request+jwt",
        })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(josePrivateKey);

    const handler = CreateWalletUnitAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: walletUnitAttestationRequestAndroidWithoutAttestation,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
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

  it("should return 200 when platform is Android and key attestation is present", async () => {
    const handler = CreateWalletUnitAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: walletUnitAttestationRequestAndroid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          wallet_unit_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it("should return 409 when platform is Android and keyAttestation key does not match payload.cnf.jwk", async () => {
    vi.mocked(verifyAndroidAttestation).mockImplementationOnce(
      () => () =>
        TE.right({
          deviceDetails: {
            attestationSecurityLevel: 2,
            attestationVersion: 3,
            keymasterSecurityLevel: 2,
            keymasterVersion: 4,
            platform: "android",
          },
          jwk: {
            ...publicEcKey,
            x: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          },
        }),
    );

    const handler = CreateWalletUnitAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: walletUnitAttestationRequestAndroid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 409,
      }),
    });
  });

  it("should return 200 when platform is iOS and key attestation is absent", async () => {
    const handler = CreateWalletUnitAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          wallet_unit_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });
});
