import { it, expect, describe } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { pipe } from "fp-ts/function";
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

  //Create a mock of Wallet Instance Request
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

  it("should return a 204 HTTP response", async () => {
    const handler = CreateWalletInstanceHandler({
      input: pipe(H.request("https://wallet-provider.example.org"), (req) => ({
        ...req,
        method: "POST",
        body: walletInstanceRequest,
      })),
      inputDecoder: H.HttpRequest,
      logger,
      attestationServiceConfiguration,
      nonceRepository,
    });

    const result = await handler();

    if (result._tag === "Left") {
      throw new Error("Expecting Right");
    }
    const {
      right: { statusCode },
    } = result;

    expect(statusCode).toBe(204);
  });

  it("should return a 422 HTTP response on invalid body", () => {
    const invalidBody = {
      foo: "foo",
    };
    const handler = CreateWalletInstanceHandler({
      input: pipe(H.request("https://wallet-provider.example.org"), (req) => ({
        ...req,
        method: "POST",
        body: invalidBody,
      })),
      inputDecoder: H.HttpRequest,
      logger,
      attestationServiceConfiguration,
      nonceRepository,
    });

    expect(handler()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 422,
          headers: expect.objectContaining({
            "Content-Type": "application/problem+json",
          }),
        }),
      })
    );
  });

  it("should return a 500 HTTP response on validateChallenge error", () => {
    const nonceRepositoryThatFailsOnDelete: NonceRepository = {
      insert: () => TE.left(new Error("not implemented")),
      delete: () => TE.left(new Error("failed on delete!")),
    };

    const handler = CreateWalletInstanceHandler({
      input: pipe(H.request("https://wallet-provider.example.org"), (req) => ({
        ...req,
        method: "POST",
        body: walletInstanceRequest,
      })),
      inputDecoder: H.HttpRequest,
      logger,
      attestationServiceConfiguration,
      nonceRepository: nonceRepositoryThatFailsOnDelete,
    });

    expect(handler()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 500,
          headers: expect.objectContaining({
            "Content-Type": "application/problem+json",
          }),
        }),
      })
    );
  });
});
