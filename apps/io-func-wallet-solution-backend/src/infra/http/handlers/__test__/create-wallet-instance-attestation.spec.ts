import { it, expect, describe } from "vitest";

import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { pipe, flow } from "fp-ts/function";
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

const federationEntityMetadata: FederationEntityMetadata = {
  basePath: new URL(
    "https://wallet-provider.example.org"
  ) as unknown as ValidUrl,
  organizationName: "wallet provider" as NonEmptyString,
  homePageUri: new URL(
    "https://wallet-provider.example.org/privacy_policy"
  ) as unknown as ValidUrl,
  policyUri: new URL(
    "https://wallet-provider.example.org/info_policy"
  ) as unknown as ValidUrl,
  tosUri: new URL(
    "https://wallet-provider.example.org/logo.svg"
  ) as unknown as ValidUrl,
  logoUri: new URL(
    "https://wallet-provider.example.org/logo.svg"
  ) as unknown as ValidUrl,
  trustAnchorUri: new URL(
    "https://trust-anchor.example.org/logo.svg"
  ) as unknown as ValidUrl,
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

  it("should return a 201 HTTP response", () => {
    const run = CreateWalletInstanceAttestationHandler({
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
    expect(run()).resolves.toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          statusCode: 201,
        }),
      })
    );
  });
});
