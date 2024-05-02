import { it, expect, describe, beforeAll, afterAll } from "vitest";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as jose from "jose";
import { CreateWalletAttestationHandler } from "../create-wallet-attestation";
import {
  federationEntityMetadata,
  trustAnchorPort,
  trustAnchorServerMock,
} from "./trust-anchor";
import { privateEcKey, publicEcKey, signer } from "./keys";
import { GRANT_TYPE_KEY_ATTESTATION } from "@/wallet-provider";

beforeAll(() => {
  trustAnchorServerMock.listen(trustAnchorPort);
});

afterAll(() => {
  trustAnchorServerMock.close();
});

describe("CreateWalletAttestationHandler", async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);
  const walletAttestationRequest = await new jose.SignJWT({
    iss: "demokey",
    aud: "https://wallet-provider.example.org/",
    challenge: "...",
    hardware_signature: "...",
    integrity_assertion: "...",
    hardware_key_tag: "...",
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

    // check trailing slashes are removed
    const decoded = jose.decodeJwt(body as string);
    expect((decoded.iss || "").endsWith("/")).toBe(false);
    expect((decoded.sub || "").endsWith("/")).toBe(false);
  });
});
