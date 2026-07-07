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
import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { ECPrivateKeyWithKid } from "io-wallet-common/jwk";
import * as jose from "jose";
import { describe, expect, it, vi } from "vitest";

import { CertificateRepository } from "@/certificates";
import {
  AndroidAttestationValidationConfig,
  AssertionValidationConfig,
  IntegrityCheckError,
  verifyAndroidAttestation,
  verifyIosAssertion,
} from "@/infra/mobile-attestation-service";
import { iOSMockData } from "@/infra/mobile-attestation-service/ios/__tests__/config";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";

import { CreateKeyAttestationHandler } from "../create-key-attestation";
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

const statusListBaseUrl = "https://status-list.example.org";

const walletInstanceStatus = {
  index: 412,
  statusListId: "status-list-a" as NonEmptyString,
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

const keyAttestationSigningKey = privateEcKey;

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
        status: walletInstanceStatus,
        userId: mockFiscalCode,
      }),
    ),
  getLastByUserId: () => TE.left(new Error("not implemented")),
  getValidByUserId: () => TE.left(new Error("not implemented")),
  getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
  insert: () => TE.left(new Error("not implemented")),
};

const certificateRepository: CertificateRepository = {
  getCertificateChainByKid: () => TE.right(O.some(["cert1", "cert2"])),
  insertCertificateChain: () => TE.right(undefined),
};

const data = Buffer.from(assertion, "base64");
const { authenticatorData, signature } = decode(data);

const generateP521PrivateJwk = (kid: string): Promise<ECPrivateKeyWithKid> =>
  jose
    .generateKeyPair("ES512", {
      extractable: true,
    })
    .then(({ privateKey }) => jose.exportJWK(privateKey))
    .then((jwk) =>
      pipe(
        {
          ...jwk,
          kid,
        },
        ECPrivateKeyWithKid.decode,
        E.getOrElseW((_) => {
          throw new Error(`Failed to decode P-521 private JWK ${_[0].value}`);
        }),
      ),
    );

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

describe("CreateKeyAttestationHandler", async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);
  const publicEcKeyWithoutKid = {
    crv: publicEcKey.crv,
    kty: publicEcKey.kty,
    x: publicEcKey.x,
    y: publicEcKey.y,
  };

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

  const keyAttestationRequestIos = await new jose.SignJWT({
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

  const keyAttestationRequestAndroid = await new jose.SignJWT({
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

  const keyToAttestJwtAndroidWithoutKid = await new jose.SignJWT({
    cnf: {
      jwk: publicEcKeyWithoutKid,
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

  const keyAttestationRequestAndroidWithoutKid = await new jose.SignJWT({
    aud: "aud",
    cnf: {
      jwk: publicEcKeyWithoutKid,
    },
    hardware_key_tag: keyId,
    hardware_signature: signature.toString("base64"),
    integrity_assertion: authenticatorData.toString("base64"),
    iss: keyId,
    keys_to_attest: [keyToAttestJwtAndroidWithoutKid],
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
      assertion: keyAttestationRequestIos,
      fiscal_code: mockFiscalCode,
    },
    method: "POST",
  };

  it("should return a 200 HTTP response on success if is a test user", async () => {
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: keyAttestationRequestIos,
          fiscal_code: "LVTEST00A00H501P",
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          key_attestation: "this_is_a_test_key_attestation",
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it("should return a 200 HTTP response on success with iOS platform", async () => {
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          key_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it("should sign the jwt with the algorithm derived from the provider key curve - P-521", async () => {
    const p521SigningKey = await generateP521PrivateJwk("p521#key-attestation");
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey: p521SigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    const result = await handler();

    expect(E.isRight(result)).toBe(true);
    if (E.isLeft(result)) {
      throw result.left;
    }

    const body = t
      .type({
        key_attestation: t.string,
      })
      .decode(result.right.body);

    expect(E.isRight(body)).toBe(true);
    if (E.isLeft(body)) {
      throw new Error("Invalid response body");
    }

    expect(
      jose.decodeProtectedHeader(body.right.key_attestation),
    ).toMatchObject({
      alg: "ES512",
      kid: p521SigningKey.kid,
    });
  });

  it("should sign the jwt with the algorithm derived from the provider key curve - P-256", async () => {
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey: privateEcKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    const result = await handler();

    expect(E.isRight(result)).toBe(true);
    if (E.isLeft(result)) {
      throw result.left;
    }

    const body = t
      .type({
        key_attestation: t.string,
      })
      .decode(result.right.body);

    expect(E.isRight(body)).toBe(true);
    if (E.isLeft(body)) {
      throw new Error("Invalid response body");
    }

    expect(
      jose.decodeProtectedHeader(body.right.key_attestation),
    ).toMatchObject({
      alg: "ES256",
      kid: privateEcKey.kid,
    });
  });

  it("should return a 200 HTTP response on success with Android platform", async () => {
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: keyAttestationRequestAndroid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          key_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });

    expect(verifyAndroidAttestation).toHaveBeenCalledWith(
      "base64_attestation",
      challenge,
    );
  });

  it("should include kid in attested_keys when present in the request for Android", async () => {
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: keyAttestationRequestAndroid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(5);

    if (E.isRight(result)) {
      const body = t
        .type({
          key_attestation: t.string,
        })
        .decode(result.right.body);

      expect(E.isRight(body)).toBe(true);

      if (E.isRight(body)) {
        const keyAttestation = jose.decodeJwt(body.right.key_attestation);
        expect(keyAttestation.iss).toBe(
          "https://wallet-provider-v13.example.org/bar",
        );
        expect(keyAttestation.status).toEqual({
          status_list: {
            idx: walletInstanceStatus.index,
            uri: `${statusListBaseUrl}/${walletInstanceStatus.statusListId}`,
          },
        });
        const attestedKeys = t
          .array(
            t.type({
              crv: t.string,
              kid: t.string,
              kty: t.string,
              x: t.string,
              y: t.string,
            }),
          )
          .decode(keyAttestation.attested_keys);

        expect(E.isRight(attestedKeys)).toBe(true);

        if (E.isRight(attestedKeys)) {
          expect(attestedKeys.right[0].kid).toBe(publicEcKey.kid);
        }
      }
    }
  });

  it("should include kid in attested_keys when present in the request for iOS", async () => {
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(3);

    if (E.isRight(result)) {
      const body = t
        .type({
          key_attestation: t.string,
        })
        .decode(result.right.body);

      expect(E.isRight(body)).toBe(true);

      if (E.isRight(body)) {
        const keyAttestation = jose.decodeJwt(body.right.key_attestation);
        const attestedKeys = t
          .array(
            t.type({
              crv: t.string,
              kid: t.string,
              kty: t.string,
              x: t.string,
              y: t.string,
            }),
          )
          .decode(keyAttestation.attested_keys);

        expect(E.isRight(attestedKeys)).toBe(true);

        if (E.isRight(attestedKeys)) {
          expect(attestedKeys.right[0].kid).toBe(publicEcKey.kid);
        }
      }
    }
  });

  it("should omit kid in attested_keys when cnf.jwk.kid is absent in the request for Android", async () => {
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: keyAttestationRequestAndroidWithoutKid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(3);

    if (E.isRight(result)) {
      const body = t
        .type({
          key_attestation: t.string,
        })
        .decode(result.right.body);

      expect(E.isRight(body)).toBe(true);

      if (E.isRight(body)) {
        const keyAttestation = jose.decodeJwt(body.right.key_attestation);
        const attestedKeys = t
          .array(
            t.type({
              crv: t.string,
              kty: t.string,
              x: t.string,
              y: t.string,
            }),
          )
          .decode(keyAttestation.attested_keys);

        expect(E.isRight(attestedKeys)).toBe(true);

        if (E.isRight(attestedKeys)) {
          expect(attestedKeys.right[0]).not.toHaveProperty("kid");
        }
      }
    }
  });

  it("should return a 409 HTTP response with Android platform when verifyAndroidAttestation fails", async () => {
    vi.mocked(verifyAndroidAttestation).mockReturnValueOnce(() =>
      TE.left(new IntegrityCheckError(["foo"])),
    );
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: keyAttestationRequestAndroid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
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

    expect(verifyAndroidAttestation).toHaveBeenCalledWith(
      "base64_attestation",
      challenge,
    );
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

    const keyAttestationRequestAndroidWithoutAttestation =
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

    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: keyAttestationRequestAndroidWithoutAttestation,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
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

    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          assertion: keyAttestationRequestAndroid,
          fiscal_code: mockFiscalCode,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
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
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
      walletInstanceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          key_attestation: expect.any(String),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });
  });

  it("should return a 409 HTTP response with iOS platform when verifyIosAssertion fails", async () => {
    vi.mocked(verifyIosAssertion).mockReturnValueOnce(() =>
      TE.left(new IntegrityCheckError(["foo"])),
    );
    const handler = CreateKeyAttestationHandler({
      androidAttestationValidationConfig,
      assertionValidationConfig,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      keyAttestationSigningKey,
      logger,
      nonceRepository,
      statusListBaseUrl,
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
});
