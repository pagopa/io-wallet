/* eslint-disable max-lines-per-function */
import { AttestationService } from "@/attestation-service";
import { CertificateRepository } from "@/certificates";
import { iOSMockData } from "@/infra/mobile-attestation-service/ios/__test__/config";
import { NonceRepository } from "@/nonce";
import { WalletInstanceRepository } from "@/wallet-instance";
import IssuerAuth from "@auth0/mdl/lib/mdoc/model/IssuerAuth";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { UtcOnlyIsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import {
  EmailString,
  FiscalCode,
  NonEmptyString,
} from "@pagopa/ts-commons/lib/strings";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import * as appInsights from "applicationinsights";
import * as assert from "assert";
import { decode } from "cbor-x";
import * as cbor from "cbor2";
import * as crypto from "crypto";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { flow } from "fp-ts/lib/function";
import * as t from "io-ts";
import * as jose from "jose";
import { describe, expect, it } from "vitest";

import {
  CreateWalletAttestationV2Handler,
  WalletAttestations,
} from "../create-wallet-attestation-v2";
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

const Uint8ArrayType = new t.Type<Uint8Array, Uint8Array, unknown>(
  "Uint8Array",
  (u): u is Uint8Array => u instanceof Uint8Array,
  (u, c) =>
    u instanceof Uint8Array
      ? t.success(u)
      : t.failure(u, c, "Not a Uint8Array"),
  t.identity,
);

const BufferFrom = new t.Type<Buffer, Buffer, unknown>(
  "BufferFrom",
  (u): u is Buffer => Buffer.isBuffer(u),
  (u, c) => (Buffer.isBuffer(u) ? t.success(u) : t.failure(u, c)),
  t.identity,
);

const MapNumberBuffer = new t.Type<
  Map<number, Buffer | Buffer[]>,
  Map<number, Buffer | Buffer[]>,
  unknown
>(
  "MapNumberBuffer",
  (u): u is Map<number, Buffer | Buffer[]> =>
    u instanceof Map &&
    [...u.entries()].every(
      ([k, v]) =>
        typeof k === "number" &&
        (Buffer.isBuffer(v) || (Array.isArray(v) && v.every(Buffer.isBuffer))),
    ),
  (u, c) =>
    u instanceof Map &&
    [...u.entries()].every(
      ([k, v]) =>
        typeof k === "number" &&
        (Buffer.isBuffer(v) || (Array.isArray(v) && v.every(Buffer.isBuffer))),
    )
      ? t.success(u as Map<number, Buffer | Buffer[]>)
      : t.failure(u, c),
  t.identity,
);

const ValueType = new t.Type<
  Buffer | number | string,
  Buffer | number | string,
  unknown
>(
  "BufferNumberOrString",
  (u): u is Buffer | number | string =>
    typeof u === "number" || typeof u === "string" || Buffer.isBuffer(u),
  (u, c) =>
    typeof u === "number" || typeof u === "string" || Buffer.isBuffer(u)
      ? t.success(u)
      : t.failure(u, c),
  t.identity,
);

const MapNumberToBufferNumberOrString = new t.Type<
  Map<number, Buffer | number | string>,
  Map<number, Buffer | number | string>,
  unknown
>(
  "MapNumberToBufferNumberOrString",
  (u): u is Map<number, Buffer | number | string> =>
    u instanceof Map &&
    [...u.entries()].every(
      ([k, v]) => typeof k === "number" && ValueType.is(v),
    ),
  (u, c) =>
    u instanceof Map &&
    [...u.entries()].every(([k, v]) => typeof k === "number" && ValueType.is(v))
      ? t.success(u as Map<number, Buffer | number | string>)
      : t.failure(u, c),
  t.identity,
);

const Tag24WithUint8Array = t.type({
  contents: Uint8ArrayType,
  tag: t.literal(24),
});

const WalletAttestationMdocSchema = t.type({
  issuerAuth: t.tuple([BufferFrom, MapNumberBuffer, BufferFrom, BufferFrom]),
  nameSpaces: t.type({
    "org.iso.18013.5.1.IT": t.tuple([
      Tag24WithUint8Array,
      Tag24WithUint8Array,
      Tag24WithUint8Array,
      Tag24WithUint8Array,
    ]),
  }),
});

const DecodedNameSpaceSchema = t.array(
  t.type({
    digestID: t.number,
    elementIdentifier: t.string,
    elementValue: t.string,
    random: Uint8ArrayType,
  }),
);

const IssuerAuthPayloadSchema = t.type({
  deviceKeyInfo: t.type({
    deviceKey: MapNumberToBufferNumberOrString,
  }),
  digestAlgorithm: t.literal("SHA-256"),
  docType: t.literal("org.iso.18013.5.1.IT.WalletAttestation"),
  validityInfo: t.type({
    signed: UtcOnlyIsoDateFromString,
    validFrom: UtcOnlyIsoDateFromString,
    validUntil: UtcOnlyIsoDateFromString,
  }),
  valueDigests: t.type({
    "org.iso.18013.5.1.IT": MapNumberBuffer,
  }),
  version: t.literal("1.0"),
});

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
  trustAnchorUrl: url("https://foo.com"),
  walletLink: "https://foo.com",
  walletName: "Wallet name",
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
  deleteAllByUserId: () => TE.left(new Error("not implemented")),
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
  getUserId: () =>
    TE.right(
      O.some({
        id: "123" as NonEmptyString,
        userId: mockFiscalCode,
      }),
    ),
  getValidByUserIdExcludingOne: () => TE.left(new Error("not implemented")),
  insert: () => TE.left(new Error("not implemented")),
};

const certificateRepository: CertificateRepository = {
  insertCertificateChain: () => TE.right(undefined),
  getCertificateChainByKid: () => TE.right(O.some(["cert1", "cert2"])),
};

const data = Buffer.from(assertion, "base64");
const { authenticatorData, signature } = decode(data);

const telemetryClient: appInsights.TelemetryClient = {
  trackException: () => void 0,
} as unknown as appInsights.TelemetryClient;

function isStringArray(u: unknown): u is string[] {
  return Array.isArray(u) && u.every((item) => typeof item === "string");
}

describe("CreateWalletAttestationV2Handler", async () => {
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
    const handler = CreateWalletAttestationV2Handler({
      attestationService: mockAttestationService,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
      walletAttestationConfig,
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
    const handler = CreateWalletAttestationV2Handler({
      attestationService: mockAttestationService,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
      walletAttestationConfig,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(4);

    if (E.isRight(result)) {
      const body = WalletAttestations.decode(result.right.body);
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
          // check trailing slashes are removed
          expect((jwtPayload.iss || "").endsWith("/")).toBe(false);
          expect((jwtPayload.sub || "").endsWith("/")).toBe(false);
        }
      }
    }
  });

  it("should return a correctly encoded sdjwt with disclosures on success and URLs within the token should not have trailing slashes", async () => {
    const handler = CreateWalletAttestationV2Handler({
      attestationService: mockAttestationService,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
      walletAttestationConfig,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(6);

    if (E.isRight(result)) {
      const body = WalletAttestations.decode(result.right.body);
      if (E.isRight(body)) {
        const walletAttestations = body.right.wallet_attestations;
        const walletAttestationDcSdJwt = walletAttestations.find(
          (walletAttestation) => walletAttestation.format === "dc+sd-jwt",
        );
        if (walletAttestationDcSdJwt) {
          const splittedVpToken =
            walletAttestationDcSdJwt.wallet_attestation.split("~");
          const sdJwt = splittedVpToken[0];
          const disclosures = splittedVpToken.slice(1);

          // check the properties of the header and payload
          const jwtHeader = jose.decodeProtectedHeader(sdJwt);
          expect(Object.keys(jwtHeader).sort()).toEqual(
            ["alg", "typ", "kid"].sort(),
          );
          const jwtPayload = jose.decodeJwt(sdJwt);
          expect(Object.keys(jwtPayload).sort()).toEqual(
            [
              "aal",
              "exp",
              "iat",
              "cnf",
              "iss",
              "sub",
              "vct",
              "_sd",
              "_sd_alg",
            ].sort(),
          );

          // check that the hashed disclosures are included in _sd
          const _sd = jwtPayload._sd;
          if (isStringArray(_sd)) {
            disclosures.forEach((disclosure) => {
              const disclosureDigest = crypto
                .createHash("sha256")
                .update(disclosure)
                .digest("base64url");

              expect(_sd.includes(disclosureDigest)).toBe(true);
            });
          }

          // check trailing slashes are removed
          expect((jwtPayload.iss || "").endsWith("/")).toBe(false);
          expect((jwtPayload.sub || "").endsWith("/")).toBe(false);
        }
      }
    }
  });

  it("should return a correctly encoded mdoc cbor on success", async () => {
    const handler = CreateWalletAttestationV2Handler({
      attestationService: mockAttestationService,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
      walletAttestationConfig,
      walletInstanceRepository,
    });

    const result = await handler();

    expect.assertions(6);

    assert.ok(E.isRight(result));

    const body = WalletAttestations.decode(result.right.body);

    assert.ok(E.isRight(body));

    const walletAttestations = body.right.wallet_attestations;
    const walletAttestationMdoc = walletAttestations.find(
      (walletAttestation) => walletAttestation.format === "mso_mdoc",
    );

    assert.ok(walletAttestationMdoc);

    const buffer = Buffer.from(
      walletAttestationMdoc.wallet_attestation,
      "base64",
    );

    const cborDecoded = cbor.decode(buffer);

    const decodedWalletAttestationMdoc =
      WalletAttestationMdocSchema.decode(cborDecoded);

    // test cborDecoded has expected structure and specific docType
    assert.ok(E.isRight(decodedWalletAttestationMdoc));

    const {
      issuerAuth,
      nameSpaces: { "org.iso.18013.5.1.IT": encodedDomesticNameSpace },
    } = decodedWalletAttestationMdoc.right;

    // nameSpaces
    const decodedDomesticNameSpace = encodedDomesticNameSpace.map(
      ({ contents }) => cbor.decode(contents),
    );

    const validatedDomesticNameSpace = DecodedNameSpaceSchema.decode(
      decodedDomesticNameSpace,
    );

    // test domestic namespace has correct fields (digestID, elementIdentifier, elementValue, random)
    assert.ok(E.isRight(validatedDomesticNameSpace));

    const domesticNameSpace = validatedDomesticNameSpace.right;

    const elementIdentifiers = domesticNameSpace.map(
      ({ elementIdentifier }) => elementIdentifier,
    );

    // test domestic namespace has correct properties (wallet_name, wallet_link, sub, aal)
    expect(elementIdentifiers.sort()).toEqual(
      ["wallet_name", "wallet_link", "sub", "aal"].sort(),
    );

    // issuerAuth
    const [protectedHeaderBytes, unprotectedHeader, payload, signature] =
      issuerAuth;

    // test issuerAuth has correct protected header
    expect(cbor.decode(protectedHeaderBytes)).toEqual(new Map([[1, -7]]));

    // test issuerAuth has correct unprotected header
    const kid = Buffer.from(privateEcKey.kid);
    expect(unprotectedHeader.has(4)).toBe(true);
    expect(unprotectedHeader.get(4)).toEqual(Buffer.from(kid));
    // TODO: add test for key 33

    const decodedIssuerAuthBytes = cbor.decode(payload);

    if (
      decodedIssuerAuthBytes instanceof cbor.Tag &&
      decodedIssuerAuthBytes.tag === 24 && // CBOR tag 24 is for a byte string containing encoded CBOR
      decodedIssuerAuthBytes.contents instanceof Buffer
    ) {
      const decodedIssuerAuth = cbor.decode(decodedIssuerAuthBytes.contents);

      const validatedIssuerAuthPayload =
        IssuerAuthPayloadSchema.decode(decodedIssuerAuth);

      // test issuerAuth has correct payload
      expect(E.isRight(validatedIssuerAuthPayload)).toBe(true);
    }

    const publicKey = await jose.importJWK(publicEcKey);

    const newIssuerAuth = new IssuerAuth(
      protectedHeaderBytes,
      unprotectedHeader,
      payload,
      signature,
    );

    // test issuerAuth signature is correct
    await expect(newIssuerAuth.verify(publicKey)).resolves.toBe(true);
  });

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion1: "foo",
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationV2Handler({
      attestationService: mockAttestationService,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
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
    const handler = CreateWalletAttestationV2Handler({
      attestationService: mockAttestationService,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
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
      getUserId: () => TE.right(O.none),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        assertion: walletAttestationRequest,
        fiscal_code: mockFiscalCode,
      },
      method: "POST",
    };
    const handler = CreateWalletAttestationV2Handler({
      attestationService: mockAttestationService,
      certificateRepository,
      federationEntity,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      nonceRepository,
      signer,
      telemetryClient,
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
});
