import { it, expect, describe } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { pipe } from "fp-ts/function";

import { CreateWalletInstanceHandler } from "../create-wallet-instance";
import { APPLE_APP_ATTESTATION_ROOT_CA } from "../../../../app/config";
import { iOSMockAttestationData } from "../../../attestation-service/ios/__test__/config";

describe("CreateWalletInstanceHandler", async () => {
  const { challenge, attestation, keyId } = iOSMockAttestationData;

  //Create a mock of Wallet Instance Request
  const walletInstanceRequest = {
    challenge,
    key_attestation: attestation,
    hardware_key_tag: keyId,
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
      iOsBundleIdentifier:
        "org.reactjs.native.example.IoReactNativeIntegrityExample",
      iOsTeamIdentifier: "M2X5YQ4BJ7",
      androidBundleIdentifier:
        "org.reactjs.native.example.IoReactNativeIntegrityExample",
      appleRootCertificate: APPLE_APP_ATTESTATION_ROOT_CA,
      allowDevelopmentEnvironment: true,
    });

    const result = await handler();

    if (result._tag === "Left") {
      throw new Error("Expecting Right");
    }
    const {
      right: { statusCode, body },
    } = result;

    expect(statusCode).toBe(201);
    expect(body).toEqual(expect.any(String));
    expect(body).toEqual("OK");
  });

  it("test", () => {
    expect(1).toBe(1);
  });
});
