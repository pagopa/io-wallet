import { it, expect, describe, beforeAll, afterAll } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as E from "fp-ts/Either";
import * as jose from "jose";
import { CreateWalletAttestationHandler } from "../create-wallet-attestation";
import {
  federationEntityMetadata,
  trustAnchorPort,
  trustAnchorServerMock,
} from "./trust-anchor";
import { privateEcKey, publicEcKey, signer } from "./keys";
import { GRANT_TYPE_KEY_ATTESTATION } from "@/wallet-provider";
import { NonceRepository } from "@/nonce";
import * as TE from "fp-ts/TaskEither";
import {
  ANDROID_CRL_URL,
  ANDROID_PLAY_INTEGRITY_URL,
  APPLE_APP_ATTESTATION_ROOT_CA,
  GOOGLE_PUBLIC_KEY,
} from "@/app/config";
import { iOSMockData } from "@/infra/attestation-service/ios/__test__/config";
import { WalletInstanceRepository } from "@/wallet-instance";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { decode } from "cbor-x";

const { challenge, assertion, hardwareKey, keyId, ephemeralKey } = iOSMockData;

beforeAll(() => {
  trustAnchorServerMock.listen(trustAnchorPort);
});

afterAll(() => {
  trustAnchorServerMock.close();
});

const nonceRepository: NonceRepository = {
  insert: () => TE.left(new Error("not implemented")),
  delete: () => TE.right(void 0),
};

const attestationServiceConfiguration = {
  iOsBundleIdentifier:
    "org.reactjs.native.example.IoReactNativeIntegrityExample",
  iOsTeamIdentifier: "M2X5YQ4BJ7",
  androidBundleIdentifier:
    "org.reactjs.native.example.IoReactNativeIntegrityExample",
  androidPlayStoreCertificateHash: "",
  appleRootCertificate: APPLE_APP_ATTESTATION_ROOT_CA,
  allowDevelopmentEnvironment: true,
  googlePublicKey: GOOGLE_PUBLIC_KEY,
  androidCrlUrl: ANDROID_CRL_URL,
  androidPlayIntegrityUrl: ANDROID_PLAY_INTEGRITY_URL,
  googleAppCredentialsEncoded: "",
  skipSignatureValidation: true,
};

const walletInstanceRepository: WalletInstanceRepository = {
  insert: () => TE.left(new Error("not implemented")),
  get: () =>
    TE.right({
      id: "123" as NonEmptyString,
      userId: "123" as NonEmptyString,
      hardwareKey,
      signCount: 0,
      isRevoked: false,
    }),
  batchPatchWithReplaceOperation: () => TE.left(new Error("not implemented")),
  getAllByUserId: () => TE.left(new Error("not implemented")),
};

const data = Buffer.from(assertion, "base64");
const { signature, authenticatorData } = decode(data);

describe("CreateWalletAttestationHandler", async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);
  const walletAttestationRequest = await new jose.SignJWT({
    iss: "demokey",
    sub: "https://wallet-provider.example.org/",
    challenge,
    hardware_signature: signature.toString("base64"),
    integrity_assertion: authenticatorData.toString("base64"),
    hardware_key_tag: keyId,
    cnf: {
      jwk: publicEcKey,
    },
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "war+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(josePrivateKey);

  it("should return a 201 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      method: "POST",
      body: {
        grant_type: GRANT_TYPE_KEY_ATTESTATION,
        assertion: walletAttestationRequest,
      },
      headers: {
        "x-iowallet-user-id": "x-iowallet-user-id",
      },
    };
    const handler = CreateWalletAttestationHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      federationEntityMetadata,
      signer,
      nonceRepository,
      attestationServiceConfiguration,
      walletInstanceRepository,
    });

    const result = await handler();
    expect.assertions(3);
    expect(result).toEqual({
      _tag: "Right",
      right: {
        statusCode: 201,
        headers: expect.objectContaining({
          "Content-Type": "application/entity-statement+jwt",
        }),
        body: expect.any(String),
      },
    });

    // check trailing slashes are removed
    if (E.isRight(result)) {
      const body = result.right.body;
      if (typeof body === "string") {
        const decoded = jose.decodeJwt(body);
        expect((decoded.iss || "").endsWith("/")).toBe(false);
        expect((decoded.sub || "").endsWith("/")).toBe(false);
      }
    }
  });
});
