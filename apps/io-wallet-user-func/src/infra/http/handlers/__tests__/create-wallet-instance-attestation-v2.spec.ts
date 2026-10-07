import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { describe, expect, it, vi } from "vitest";

import { WalletInstanceAttestationToJwtModel } from "@/wallet-instance-attestation";

import { ParsedWiaRequest } from "../../wallet-instance-attestation-v2-adapters";
import { CreateWalletInstanceAttestationV2Handler } from "../create-wallet-instance-attestation-v2";
import { publicEcKey } from "./keys";

const fiscalCode = "AAACCC94E17H501P" as FiscalCode;
const parsedRequest: ParsedWiaRequest = {
  userId: fiscalCode,
  wiaRequest: {
    cnf: { jwk: publicEcKey },
    hardwareKeyTag: "hardware-key" as NonEmptyString,
    hardwareSignature: "signature" as NonEmptyString,
    integrityAssertion: "integrity" as NonEmptyString,
    nonce: "nonce" as NonEmptyString,
    platform: "ios",
    walletSolutionId: "appio",
    walletSolutionVersion: "1.0.0" as NonEmptyString,
  },
};

const createDependencies = (parsed: ParsedWiaRequest = parsedRequest) => {
  const events: string[] = [];
  const dependencyMock = {
    clientData: vi.fn(
      async () => '{"challenge":"nonce","jwk_thumbprint":"client-thumbprint"}',
    ),
    consumeNonce: vi.fn(async () => void events.push("nonce")),
    encodeAttestation: vi.fn(WalletInstanceAttestationToJwtModel.encode),
    federationEntityId: { href: "https://wallet-provider.example.org/" },
    getSigningKey: vi.fn(async () => {
      events.push("key");
      return {
        ...publicEcKey,
        certificateChain: ["certificate"],
        keyName: "signing-key",
      };
    }),
    getWalletInstance: vi.fn(async () => {
      events.push("instance");
      return {
        hardwareKey: publicEcKey,
        signCount: 4,
      };
    }),
    parseRequest: vi.fn(async () => parsed),
    sendTelemetry: vi.fn(async () => void events.push("telemetry")),
    sign: vi.fn(async () => {
      events.push("sign");
      return "signed-token";
    }),
    thumbprint: vi.fn(async () => "client-thumbprint"),
    verifyAndroid: vi.fn(async () => void events.push("android")),
    verifyIos: vi.fn(async () => void events.push("ios")),
  };
  return { dependencyMock, events };
};

describe("CreateWalletInstanceAttestationV2Handler", () => {
  it("consumes nonce, validates hardware, gets key, then signs", async () => {
    const { dependencyMock, events } = createDependencies();
    const logError = vi.fn();
    const handler = CreateWalletInstanceAttestationV2Handler(
      dependencyMock as never,
    );

    const response = await handler({ anything: true }, logError);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      wallet_instance_attestation: "signed-token",
    });
    expect(events).toEqual(["nonce", "instance", "ios", "key", "sign"]);
    expect(dependencyMock.verifyIos).toHaveBeenCalledWith({
      clientData: expect.any(String),
      hardwareKey: publicEcKey,
      hardwareSignature: parsedRequest.wiaRequest.hardwareSignature,
      integrityAssertion: parsedRequest.wiaRequest.integrityAssertion,
      signCount: 4,
    });
    expect(dependencyMock.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        crv: publicEcKey.crv,
        kid: publicEcKey.kid,
        payload: expect.objectContaining({
          cnf: {
            jwk: expect.objectContaining({ alg: "ES256" }),
          },
          iss: "https://wallet-provider.example.org",
          sub: "client-thumbprint",
          wallet_link: "https://ioapp.it/",
          wallet_name: "App IO",
        }),
        x5c: ["certificate"],
      }),
    );
    expect(logError).not.toHaveBeenCalled();
  });

  it("uses the Android verifier and passes the user for developer configuration", async () => {
    const androidRequest: ParsedWiaRequest = {
      ...parsedRequest,
      wiaRequest: { ...parsedRequest.wiaRequest, platform: "android" },
    };
    const { dependencyMock } = createDependencies(androidRequest);
    const handler = CreateWalletInstanceAttestationV2Handler(
      dependencyMock as never,
    );

    const response = await handler({}, vi.fn());

    expect(response.statusCode).toBe(200);
    expect(dependencyMock.verifyAndroid).toHaveBeenCalledWith({
      clientData: expect.any(String),
      hardwareKey: publicEcKey,
      hardwareSignature: parsedRequest.wiaRequest.hardwareSignature,
      integrityAssertion: parsedRequest.wiaRequest.integrityAssertion,
      user: fiscalCode,
    });
    expect(dependencyMock.verifyIos).not.toHaveBeenCalled();
  });

  it("skips only hardware verification for load test users", async () => {
    const loadTestRequest: ParsedWiaRequest = {
      ...parsedRequest,
      userId: "LVTEST00A00F000X" as FiscalCode,
    };
    const { dependencyMock, events } = createDependencies(loadTestRequest);
    const handler = CreateWalletInstanceAttestationV2Handler(
      dependencyMock as never,
    );

    const response = await handler({}, vi.fn());

    expect(response.statusCode).toBe(200);
    expect(events).toEqual(["nonce", "instance", "key", "sign"]);
    expect(dependencyMock.getWalletInstance).toHaveBeenCalledOnce();
    expect(dependencyMock.verifyIos).not.toHaveBeenCalled();
    expect(dependencyMock.verifyAndroid).not.toHaveBeenCalled();
  });

  it("stops on the first failure, reports telemetry, and does not roll back the nonce", async () => {
    const { dependencyMock, events } = createDependencies();
    const failure = new Error("Invalid nonce");
    dependencyMock.consumeNonce.mockRejectedValue(failure);
    const logError = vi.fn();
    const handler = CreateWalletInstanceAttestationV2Handler(
      dependencyMock as never,
    );

    const response = await handler({}, logError);

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual(
      expect.objectContaining({
        detail: "Error",
        title: "Internal Server Error",
      }),
    );
    expect(events).toEqual(["telemetry"]);
    expect(dependencyMock.getWalletInstance).not.toHaveBeenCalled();
    expect(dependencyMock.sign).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(failure);
  });

  it("lets telemetry failure replace the original parse error", async () => {
    const { dependencyMock } = createDependencies();
    const validationError = new H.ValidationError(["invalid assertion"]);
    const telemetryError = new Error("telemetry unavailable");
    dependencyMock.parseRequest.mockRejectedValue(validationError);
    dependencyMock.sendTelemetry.mockRejectedValue(telemetryError);
    const logError = vi.fn();
    const handler = CreateWalletInstanceAttestationV2Handler(
      dependencyMock as never,
    );

    const response = await handler({}, logError);

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual(
      expect.objectContaining({
        detail: "Error",
        title: "Internal Server Error",
      }),
    );
    expect(logError).toHaveBeenCalledWith(telemetryError);
  });
});
