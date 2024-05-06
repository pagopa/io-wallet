import { it, expect, describe } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as TE from "fp-ts/TaskEither";

import { CreateWalletInstanceHandler } from "../create-wallet-instance";
import {
  ANDROID_CRL_URL,
  ANDROID_PLAY_INTEGRITY_URL,
  APPLE_APP_ATTESTATION_ROOT_CA,
  GOOGLE_PUBLIC_KEY,
} from "@/app/config";
import { iOSMockData } from "@/infra/attestation-service/ios/__test__/config";
import { NonceRepository } from "@/nonce";

describe("CreateWalletInstanceHandler", () => {
  const { challenge, attestation, keyId } = iOSMockData;

  const walletInstanceRequest = {
    challenge,
    key_attestation: attestation,
    hardware_key_tag: keyId,
  };

  const nonceRepository: NonceRepository = {
    insert: () => TE.left(new Error("not implemented")),
    delete: () => TE.right(void 0),
  };

  const logger = {
    log: () => () => {},
    format: L.format.simple,
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
  };

  it("should return a 204 HTTP response on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      method: "POST",
      body: walletInstanceRequest,
    };
    const handler = CreateWalletInstanceHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      attestationServiceConfiguration,
      nonceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 204,
      }),
    });
  });

  it("should return a 422 HTTP response on invalid body", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      method: "POST",
      body: {
        foo: "foo",
      },
    };
    const handler = CreateWalletInstanceHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      attestationServiceConfiguration,
      nonceRepository,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 422,
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
      }),
    });
  });

  it("should return a 500 HTTP response on validateChallenge error", async () => {
    const nonceRepositoryThatFailsOnDelete: NonceRepository = {
      insert: () => TE.left(new Error("not implemented")),
      delete: () => TE.left(new Error("failed on delete!")),
    };
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      method: "POST",
      body: walletInstanceRequest,
    };
    const handler = CreateWalletInstanceHandler({
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
      attestationServiceConfiguration,
      nonceRepository: nonceRepositoryThatFailsOnDelete,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        statusCode: 500,
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
      }),
    });
  });
});
