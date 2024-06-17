import * as http from "http";
import { vi } from "vitest";
import { flow } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as jose from "jose";
import { UrlFromString } from "@pagopa/ts-commons/lib/url";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { FederationEntityMetadata } from "../../../../entity-configuration";
import { jwks, privateEcKey } from "./keys";

export const trustAnchorPort = 8123;

const trustAnchorBaseUrl = "https://wallet-trust-anchor.example.org";

export const getEntityStatement = vi.fn().mockImplementation(async () => {
  const josePrivateKey = await jose.importJWK(privateEcKey);
  return await new jose.SignJWT({
    iss: `${trustAnchorBaseUrl}`,
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
    source_endpoint: `${trustAnchorBaseUrl}/fetch`,
    trust_marks: [
      {
        id: `${trustAnchorBaseUrl}/entity/wallet_provider`,
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
});

export const getTrustAnchotEntityConfiguration = vi
  .fn()
  .mockImplementation(async () => {
    const josePrivateKey = await jose.importJWK(privateEcKey);
    return await new jose.SignJWT({
      iss: `${trustAnchorBaseUrl}`,
      sub: `${trustAnchorBaseUrl}`,
      jwks: {
        keys: jwks,
      },
      metadata: {
        federation_entity: {
          contacts: ["io-wallet@example.org"],
          federation_fetch_endpoint: `${trustAnchorBaseUrl}/fetch`,
          federation_resolve_endpoint: `${trustAnchorBaseUrl}/resolve`,
          federation_trust_mark_status_endpoint: `${trustAnchorBaseUrl}/trust_mark_status`,
          homepage_uri: `${trustAnchorBaseUrl}`,
          name: "Trust Anchor - Wallet interop lab",
          federation_list_endpoint: `${trustAnchorBaseUrl}/list`,
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
  });

export const trustAnchorServerMock = http.createServer(async function (
  req,
  res
) {
  const { pathname } = new URL(req.url || "", `https://${req.headers.host}`);
  res.setHeader("Content-Type", "application/entity-statement+jwt");
  if (pathname.endsWith("/.well-known/openid-federation")) {
    res.write(await getTrustAnchotEntityConfiguration());
  } else if (pathname.endsWith("/fetch")) {
    res.write(await getEntityStatement());
  }
  res.end();
});

export const url = flow(
  UrlFromString.decode,
  E.getOrElseW((_) => {
    throw new Error(`Failed to parse url ${_[0].value}`);
  })
);

export const federationEntityMetadata: FederationEntityMetadata = {
  basePath: url("https://wallet-provider.example.org"),
  organizationName: "wallet provider" as NonEmptyString,
  homePageUri: url("https://wallet-provider.example.org/privacy_policy"),
  policyUri: url("https://wallet-provider.example.org/info_policy"),
  tosUri: url("https://wallet-provider.example.org/logo.svg"),
  logoUri: url("https://wallet-provider.example.org/logo.svg"),
  trustAnchorUri: url(`http://localhost:${trustAnchorPort}`),
};
