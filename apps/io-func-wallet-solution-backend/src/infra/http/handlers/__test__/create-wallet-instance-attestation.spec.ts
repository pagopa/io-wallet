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

const getEntityStatement = vi
  .fn()
  .mockImplementation(
    () =>
      `eyJ0eXAiOiJlbnRpdHktc3RhdGVtZW50K2p3dCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNGNPVDU3eGNmdmIzejlqYWtVcmpYRzM5TDNjbzB6OUJLXzVsS0t4VHl0USJ9.eyJleHAiOjE2OTE2ODE5NDcsImlhdCI6MTY5MTUwOTE0NywiaXNzIjoiaHR0cHM6Ly9kZW1vLmZlZGVyYXRpb24uZXVkaS53YWxsZXQuZGV2ZWxvcGVycy5pdGFsaWEuaXQiLCJzdWIiOiJodHRwczovL2lvLWQtd2FsbGV0LWl0LmF6dXJld2Vic2l0ZXMubmV0LyIsImp3a3MiOnsia2V5cyI6W3siY3J2IjoiUC0yNTYiLCJrdHkiOiJFQyIsIngiOiJxckpyajNBZl9CNTdzYk9JUnJjQk03YnI3d09jOHluajdsSEZQVGVmZlVrIiwieSI6IjFIMGNXRHlHZ3ZVOHcta1BLVV94eWNPQ1VOVDJvMGJ3c2xJUXRuUFU2aU0iLCJraWQiOiJFQyMxIn1dfSwibWV0YWRhdGFfcG9saWN5Ijp7IndhbGxldF9wcm92aWRlciI6eyJjb250YWN0cyI6eyJhZGQiOlsiaW8td2FsbGV0QHBhZ29wYS5pdCJdfX19LCJzb3VyY2VfZW5kcG9pbnQiOiJodHRwczovL2RlbW8uZmVkZXJhdGlvbi5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdC9mZXRjaCIsInRydXN0X21hcmtzIjpbeyJpZCI6Imh0dHBzOi8vZGVtby5mZWRlcmF0aW9uLmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0L2VudGl0eS93YWxsZXRfcHJvdmlkZXIiLCJ0cnVzdF9tYXJrIjoiZXlKMGVYQWlPaUowY25WemRDMXRZWEpySzJwM2RDSXNJbUZzWnlJNklsSlRNalUySWl3aWEybGtJam9pTkdOUFZEVTNlR05tZG1JemVqbHFZV3RWY21wWVJ6TTVURE5qYnpCNk9VSkxYelZzUzB0NFZIbDBVU0o5LmV5SnBjM01pT2lKb2RIUndjem92TDJSbGJXOHVabVZrWlhKaGRHbHZiaTVsZFdScExuZGhiR3hsZEM1a1pYWmxiRzl3WlhKekxtbDBZV3hwWVM1cGRDSXNJbk4xWWlJNkltaDBkSEJ6T2k4dmFXOHRaQzEzWVd4c1pYUXRhWFF1WVhwMWNtVjNaV0p6YVhSbGN5NXVaWFF2SWl3aWFXRjBJam94TmpreE5UQTVNVFEzTENKcFpDSTZJbWgwZEhCek9pOHZaR1Z0Ynk1bVpXUmxjbUYwYVc5dUxtVjFaR2t1ZDJGc2JHVjBMbVJsZG1Wc2IzQmxjbk11YVhSaGJHbGhMbWwwTDJWdWRHbDBlUzkzWVd4c1pYUmZjSEp2ZG1sa1pYSWlmUS5WMElLaVZWcHlNQUNJZEFLdVdGbGc0YUVFM0RHVU9XaDI2MENIUHZmOTEwQnV3NjltMlhGY1NsNlFNTkk4Wl9iVGo1ODZEYzNvOWZJM1NKRFE0SU4xSUIwR1NVXzZzTUtOMGFvWDVqa2VLaUlndnQ1YmF0X0lGVk1FVUtObmZVT2ZPVEpCLXJaNmdYTEd2d1Q3OWN6dXdsU0p2MkNiM1hYdUU3ZlkwLWRFSWdKejB2cEZtNk5RZFpzNUVRbVh5OC1IZS1hbkFTbTBsNTJKTTZkMzctamdnRTUxZl9GM0lEQWYyTTdNbF9wQVJaX3hrTkhBOGpLekFEU3ktLXE0X3Z2dTVNYWdJX2kwbHhkR1AyVEY1dUxxVVZackJGYlRqeC1BRDJUaUZYaGhtZko4d094Mm4zOWxvVWg4UlRIekpIR0JYNG96bVliQXVSMHJWOHVjeFk5MUEifV19.HSDrSLaMClE1cFsrW1TUv30sk-YJnwRi3aRkC-piiDiznTsf2G-07q285tQRygpwp-vtIIfvhFWPsl2OQErzqRbwzPgQ5ck-4bUo5kVJm_a8g6Oz-55cyK1g_7Rqxk_cw7nm0mFGKkaCP6QiI0kB7Whhapp9CnHPOKiKMUQNseXhcSTfswxBR3oqoE5HPOvEnf3-TmhoVXFf1BDaxp-canY8SHPtZVZKaKTssEkhcLW8Syrk8-HsMGu_dyAaHWi6bmraqFDrUGrrM1EubF2Hb0xs1153_UIasFCtl16WWDVo9OhHeeRcG_MA78TXt66knyXp0YD92g64b3o7fFgejA`
  );

const getTrustAnchotEntityConfiguration = vi
  .fn()
  .mockImplementation(
    () =>
      `eyJ0eXAiOiJlbnRpdHktc3RhdGVtZW50K2p3dCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNGNPVDU3eGNmdmIzejlqYWtVcmpYRzM5TDNjbzB6OUJLXzVsS0t4VHl0USJ9.eyJleHAiOjE2OTE2ODQ2NjYsImlhdCI6MTY5MTUxMTg2NiwiaXNzIjoiaHR0cHM6Ly9kZW1vLmZlZGVyYXRpb24uZXVkaS53YWxsZXQuZGV2ZWxvcGVycy5pdGFsaWEuaXQiLCJzdWIiOiJodHRwczovL2RlbW8uZmVkZXJhdGlvbi5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdCIsImp3a3MiOnsia2V5cyI6W3sia3R5IjoiUlNBIiwibiI6InVJQnZRR3kyVGVqd1FHVXYyUjFhUWd3dlQxek0xdk0xVzNVc2xFaTduT2k3Zmk3blNleGdPZmFlcmdxb1Q1M2hQaENicV8tYk14Tl9JelA0end5c01lamFCREdNMk9hZHJ0QjNUb0JhOEVoWmZoVmgwTi1tNG9LYk5WWC1ETWtObnpNeDVkdlpTWVdlRm1PUUU4Vm9PODB3ZmpSZjB4ZWVfdGRtWDBvcEE1TTU2azFRY3JrR29ZOHFWWnJJQkZGSDd4R05wRUtZZEt0OGx4TDE5Qmx2aUJkMk5YSXg0WnRDV1phR2RoU184LVg3ZHhRV2tkdkhOZmxBdDhoNXRkUl93Y0xPaldtY3hsMG05eTgzTWhrNzlwNzAyUUdVb09QTUlETnZCNlpjV08tTlRHY2dtYXlKVEFTVUpHVzhWRl9wbHhQTnN6MldzSGZVQl9VY3Qta0tRUSIsImUiOiJBUUFCIiwia2lkIjoiNGNPVDU3eGNmdmIzejlqYWtVcmpYRzM5TDNjbzB6OUJLXzVsS0t4VHl0USJ9XX0sIm1ldGFkYXRhIjp7ImZlZGVyYXRpb25fZW50aXR5Ijp7ImNvbnRhY3RzIjpbImRlbWFyY29nODNAZ21haWwuY29tIl0sImZlZGVyYXRpb25fZmV0Y2hfZW5kcG9pbnQiOiJodHRwczovL2RlbW8uZmVkZXJhdGlvbi5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdC9mZXRjaCIsImZlZGVyYXRpb25fcmVzb2x2ZV9lbmRwb2ludCI6Imh0dHBzOi8vZGVtby5mZWRlcmF0aW9uLmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0L3Jlc29sdmUiLCJmZWRlcmF0aW9uX3RydXN0X21hcmtfc3RhdHVzX2VuZHBvaW50IjoiaHR0cHM6Ly9kZW1vLmZlZGVyYXRpb24uZXVkaS53YWxsZXQuZGV2ZWxvcGVycy5pdGFsaWEuaXQvdHJ1c3RfbWFya19zdGF0dXMiLCJob21lcGFnZV91cmkiOiJodHRwczovL2RlbW8uZmVkZXJhdGlvbi5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdCIsIm5hbWUiOiJUcnVzdCBBbmNob3IgLSBXYWxsZXQgaW50ZXJvcCBsYWIiLCJmZWRlcmF0aW9uX2xpc3RfZW5kcG9pbnQiOiJodHRwczovL2RlbW8uZmVkZXJhdGlvbi5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdC9saXN0In19LCJjb25zdHJhaW50cyI6eyJtYXhfcGF0aF9sZW5ndGgiOjF9fQ.Yy15BIS8lyKA3ND2yhsK1kZiKPhiXXMbcWMT03ZsqcplaVhMY1Z40QnuOSXmPcAdBeCYZrYkbWX8-bUVCpYY21s5anP3Wum8hWfaPevp6nnaYZwN-2zPueQcoQO0_1AnCeOPpG5LkKD-8nuj-sn3IlOCtMT5sq2UWiFOJgrDDQC247qNJuZN1OhugLAbUqrpnQY2011s_RJiVADMN2JshkajmiruipJ8VVkI9kF_81UOOQJd4D3yUWUdthF8S6aeA5L6ZzWpQZNNkiB3EnvKR3B7_ksIuHG0yg1gyfQ6h9IWW292QjGAkRedr_F7BtkjT1wkWsSHHH0GhC-FdJTHWA`
  );
const trustAnchorServerMock = http.createServer(function (req, res) {
  const { pathname } = new URL(req.url || "", `https://${req.headers.host}`);
  res.setHeader("Content-Type", "applicationz/entity-statement+jwt");
  if (pathname.endsWith("/.well-known/openid-federation")) {
    res.write(getTrustAnchotEntityConfiguration());
  } else if (pathname.endsWith("/fetch")) {
    res.write(getEntityStatement());
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

  it("should return a 500 HTTP response on invalid entity statement", () => {
    getEntityStatement.mockImplementationOnce(() => "invalid");

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
          statusCode: 500,
        }),
      })
    );
  });

  it("should return a 500 HTTP response on invalid trust anchor entity configuration", () => {
    getTrustAnchotEntityConfiguration.mockImplementationOnce(() => "invalid");

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
          statusCode: 500,
        }),
      })
    );
  });
});
