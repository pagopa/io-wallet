import { it, expect, describe, vi, beforeAll, afterAll } from "vitest";
import * as http from "http";

import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { pipe, flow } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as jose from "jose";
import { CreateWalletInstanceAttestationHandler } from "../create-wallet-instance-attestation";
import { ECKey, ECPrivateKey } from "../../../../jwk";
import { CryptoSigner } from "../../../crypto/signer";
import { UrlFromString, ValidUrl } from "@pagopa/ts-commons/lib/url";
import { FederationEntityMetadata } from "../../../../entity-configuration";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { GRANT_TYPE_KEY_ATTESTATION } from "../../../../wallet-provider";

const publicEcKey = {
  kty: "EC",
  x: "CakCjesDBwXeReRwLRzmhg6UwOKfM0NZpHYHjC0iucU",
  y: "a5cs0ywZzV6MGeBR8eIHyrs8KoAqv0DuW6qqSkZFCMM",
  crv: "P-256",
  kid: "ec#1",
} as ECKey;

const privateEcKey = {
  ...publicEcKey,
  d: "vOTIOnH_rDol5cyaWL25DX4iGu_WU_l-AoTLmGIV_tg",
} as ECPrivateKey;

const jwks = [privateEcKey];

const signer = new CryptoSigner({
  jwks,
  jwtDefaultAlg: "ES256",
  jwtDefaultDuration: "1h",
});

const url = flow(
  UrlFromString.decode,
  E.getOrElseW((_) => {
    throw new Error(`Failed to parse url ${_[0].value}`);
  })
);

const getEntityStatement = vi.fn().mockImplementation(async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);
  const signed = await new jose.SignJWT({
    iss: "https://wallet-trust-anchor.example.org",
    sub: "https://wallet-provider.example.org",
    jwks: {
      keys: jwks,
    },
    metadata_policy: {
      wallet_provider: {
        contacts: {
          add: ["io-wallet@example.org"],
        },
      },
    },
    source_endpoint: "https://wallet-trust-anchor.example.org/fetch",
    trust_marks: [
      {
        id: "https://wallet-trust-anchor.example.org/entity/wallet_provider",
        trust_mark:
          "eyJ0eXAiOiJ0cnVzdC1tYXJrK2p3dCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNGNPVDU3eGNmdmIzejlqYWtVcmpYRzM5TDNjbzB6OUJLXzVsS0t4VHl0USJ9.eyJpc3MiOiJodHRwczovL2RlbW8uZmVkZXJhdGlvbi5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdCIsInN1YiI6Imh0dHBzOi8vaW8tZC13YWxsZXQtaXQuYXp1cmV3ZWJzaXRlcy5uZXQvIiwiaWF0IjoxNjkxNTA5MTQ3LCJpZCI6Imh0dHBzOi8vZGVtby5mZWRlcmF0aW9uLmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0L2VudGl0eS93YWxsZXRfcHJvdmlkZXIifQ.V0IKiVVpyMACIdAKuWFlg4aEE3DGUOWh260CHPvf910Buw69m2XFcSl6QMNI8Z_bTj586Dc3o9fI3SJDQ4IN1IB0GSU_6sMKN0aoX5jkeKiIgvt5bat_IFVMEUKNnfUOfOTJB-rZ6gXLGvwT79czuwlSJv2Cb3XXuE7fY0-dEIgJz0vpFm6NQdZs5EQmXy8-He-anASm0l52JM6d37-jggE51f_F3IDAf2M7Ml_pARZ_xkNHA8jKzADSy--q4_vvu5MagI_i0lxdGP2TF5uLqUVZrBFbTjx-AD2TiFXhhmfJ8wOx2n39loUh8RTHzJHGBX4ozmYbAuR0rV8ucxY91A",
      },
    ],
  })
    .setProtectedHeader({
      typ: "entity-statement+jwt",
      alg: "ES256",
      kid: privateEcKey.kid,
    })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(josePrivateKey);
  return signed;
});

const getTrustAnchotEntityConfiguration = vi
  .fn()
  .mockImplementation(async () => {
    const josePrivateKey = await jose.importJWK(privateEcKey);
    const signed = await new jose.SignJWT({
      iss: "https://wallet-trust-anchor.example.org",
      sub: "https://wallet-trust-anchor.example.org",
      jwks: {
        keys: jwks,
      },
      metadata: {
        federation_entity: {
          contacts: ["io-wallet@example.org"],
          federation_fetch_endpoint:
            "https://wallet-trust-anchor.example.org/fetch",
          federation_resolve_endpoint:
            "https://wallet-trust-anchor.example.org/resolve",
          federation_trust_mark_status_endpoint:
            "https://wallet-trust-anchor.example.org/trust_mark_status",
          homepage_uri: "https://wallet-trust-anchor.example.org",
          name: "Trust Anchor - Wallet interop lab",
          federation_list_endpoint:
            "https://wallet-trust-anchor.example.org/list",
        },
      },
      constraints: {
        max_path_length: 1,
      },
    })
      .setProtectedHeader({
        typ: "entity-statement+jwt",
        alg: "ES256",
        kid: privateEcKey.kid,
      })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(josePrivateKey);
    return signed;
  });
const trustAnchorServerMock = http.createServer(async function (req, res) {
  const { pathname } = new URL(req.url || "", `https://${req.headers.host}`);
  res.setHeader("Content-Type", "application/entity-statement+jwt");
  if (pathname.endsWith("/.well-known/openid-federation")) {
    res.write(await getTrustAnchotEntityConfiguration());
  } else if (pathname.endsWith("/fetch")) {
    res.write(await getEntityStatement());
  }
  res.end();
});
const trustAnchorPort = 8123;

beforeAll(() => {
  trustAnchorServerMock.listen(trustAnchorPort);
});

afterAll(() => {
  trustAnchorServerMock.close();
});

const federationEntityMetadata: FederationEntityMetadata = {
  basePath: url("https://wallet-provider.example.org"),
  organizationName: "wallet provider" as NonEmptyString,
  homePageUri: url("https://wallet-provider.example.org/privacy_policy"),
  policyUri: url("https://wallet-provider.example.org/info_policy"),
  tosUri: url("https://wallet-provider.example.org/logo.svg"),
  logoUri: url("https://wallet-provider.example.org/logo.svg"),
  trustAnchorUri: url(`http://localhost:${trustAnchorPort}`),
};

describe("CreateWalletInstanceAttestationHandler", async () => {
  //Create a mock of Wallet Instance Attestation Request
  const josePrivateKey = await jose.importJWK(privateEcKey);
  const walletInstanceAttestationRequest = await new jose.SignJWT({
    iss: "demokey",
    sub: "https://wallet-provider.example.org/",
    jti: "demoJTI",
    type: "WalletInstanceAttestationRequest",
    cnf: {
      jwk: publicEcKey,
    },
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: publicEcKey.kid,
      typ: "var+jwt",
    })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(josePrivateKey);

  it("should return a 201 HTTP response", async () => {
    const handler = CreateWalletInstanceAttestationHandler({
      input: pipe(H.request("https://wallet-provider.example.org"), (req) => ({
        ...req,
        method: "POST",
        body: {
          grant_type: GRANT_TYPE_KEY_ATTESTATION,
          assertion: walletInstanceAttestationRequest,
        },
      })),
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
