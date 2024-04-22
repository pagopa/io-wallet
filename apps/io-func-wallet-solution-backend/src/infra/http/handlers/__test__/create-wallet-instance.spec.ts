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

describe("CreateWalletInstanceHandler", async () => {
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

  it("should return a 201 HTTP response", async () => {
    const handler = CreateWalletInstanceHandler({
      input: pipe(H.request("https://wallet-provider.example.org"), (req) => ({
        ...req,
        method: "POST",
        body: walletInstanceRequest,
      })),
      inputDecoder: H.HttpRequest,
      logger: {
        log: () => () => {},
        format: L.format.simple,
      },
      attestationServiceConfiguration: {
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
      },
      nonceRepository,
    });

    const result = await handler();

    if (result._tag === "Left") {
      throw new Error("Expecting Right");
    }
    const {
      right: { statusCode, body },
    } = result;

    expect(statusCode).toBe(201);
    // expect(body).toEqual(expect.any(String));
    // expect(body).toEqual("OK");
  });
});
