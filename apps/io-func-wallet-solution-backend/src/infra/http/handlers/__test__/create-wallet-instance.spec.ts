import { it, expect, describe, vi, beforeAll, afterAll } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { pipe, flow } from "fp-ts/function";
import * as jose from "jose";

import { trustAnchorPort, trustAnchorServerMock } from "./trust-anchor";

import { privateEcKey } from "./keys";
import { CreateWalletInstanceHandler } from "../create-wallet-instance";

beforeAll(() => {
  trustAnchorServerMock.listen(trustAnchorPort);
});

afterAll(() => {
  trustAnchorServerMock.close();
});

describe("CreateWalletInstanceHandler", async () => {
  //Create a mock of Wallet Instance Request
  const josePrivateKey = await jose.importJWK(privateEcKey);
  const walletInstanceRequest = {
    challenge: "54c62fc0-7296-4b5b-a70a-adc532dcfeaa",
    key_attestation:
      "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",
    hardware_key_tag: "gLCA68odAMyGRVPZV8OC+AYSEcvEDzPHlevfOOhx0ug=",
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
      iOsBundleIdentifier: "it.grausof.integritydemo",
      iOsTeamIdentifier: "DSEVY6MV9G",
      androidBundleIdentifier: "it.grausof.integritydemo",
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
});
