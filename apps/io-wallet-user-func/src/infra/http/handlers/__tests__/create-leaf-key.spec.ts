import { CryptographyClient, KeyClient } from "@azure/keyvault-keys";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { Crypto } from "@peculiar/webcrypto";
import * as x509 from "@peculiar/x509";
import { webcrypto } from "crypto";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { calculateJwkThumbprint } from "jose";
import { describe, expect, it, vi } from "vitest";

import { pemCertificateToBase64 } from "@/infra/crypto/certificate";
import { Key } from "@/keys";

import { CreateLeafKeyHandler } from "../create-leaf-key";
import { publicEcKey } from "./keys";

const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

const toUint8Array = (value: string) => Buffer.from(value, "base64url");

const createEntityCaCertificate = async () => {
  const keys = await webcrypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["sign", "verify"],
  );

  const certificate = await x509.X509CertificateGenerator.createSelfSigned(
    {
      extensions: [
        new x509.BasicConstraintsExtension(true, 0, true),
        new x509.KeyUsagesExtension(
          x509.KeyUsageFlags.keyCertSign + x509.KeyUsageFlags.cRLSign,
          true,
        ),
      ],
      keys: keys as unknown as CryptoKeyPair,
      name: "CN=Entity CA",
      signingAlgorithm: {
        hash: "SHA-256",
        name: "ECDSA",
      },
    },
    webcrypto as Crypto,
  );

  return certificate.toString("pem");
};

describe("CreateLeafKeyHandler", () => {
  it("should create a leaf key document and return its public information", async () => {
    const entityCaCertificatePem = await createEntityCaCertificate();
    const leafKeyThumbprint = await calculateJwkThumbprint(publicEcKey);
    const createdKeys: Key[] = [];
    let leafKeyName = "";
    const createEcKey = vi.fn((name: string) => {
      leafKeyName = name;

      return Promise.resolve({
        key: {
          crv: "P-256",
          kty: "EC",
          x: toUint8Array(publicEcKey.x),
          y: toUint8Array(publicEcKey.y),
        },
        name,
        properties: {},
      });
    });
    const sign = vi.fn(() =>
      Promise.resolve({
        algorithm: "ES256",
        result: Buffer.alloc(64),
      }),
    );

    const handler = CreateLeafKeyHandler({
      createCryptographyClient: () => ({
        sign: sign as unknown as Pick<CryptographyClient, "sign">["sign"],
      }),
      cryptoProvider: new Crypto(),
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          issuerKeyName: "entity-ca-key",
          leafKeyName: "leaf-key",
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyClient: {
        createEcKey: createEcKey as unknown as Pick<
          KeyClient,
          "createEcKey"
        >["createEcKey"],
      },
      keyRepository: {
        createKey: (key) => {
          createdKeys.push(key);
          return TE.right(undefined);
        },
        getKeyByName: (keyName) =>
          TE.right(
            O.some({
              certificateChain: [
                pemCertificateToBase64(entityCaCertificatePem),
              ],
              keyName,
              publicKey: publicEcKey,
            }),
          ),
      },
      logger,
    });

    const result = await handler();

    expect(result).toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: expect.objectContaining({
          certificate_chain: [
            expect.not.stringContaining("BEGIN CERTIFICATE"),
            pemCertificateToBase64(entityCaCertificatePem),
          ],
          id: leafKeyName,
          public_key: expect.objectContaining({
            crv: "P-256",
            kid: leafKeyThumbprint,
            kty: "EC",
            x: publicEcKey.x,
            y: publicEcKey.y,
          }),
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });

    expect(createEcKey).toHaveBeenCalledWith("leaf-key", {
      curve: "P-256",
      exportable: false,
      keyOps: ["sign", "verify"],
    });
    expect(sign).toHaveBeenCalledWith("ES256", expect.any(Buffer));
    expect(createdKeys).toHaveLength(1);
    const leafCertificate = new x509.X509Certificate(
      Buffer.from(createdKeys[0].certificateChain[0], "base64"),
    );
    const entityCaCertificate = new x509.X509Certificate(
      entityCaCertificatePem,
    );

    expect(leafCertificate.subject).toBe(leafCertificate.issuer);
    expect(leafCertificate.subject).toBe(entityCaCertificate.subject);
    expect(createdKeys[0].keyName).toBe(leafKeyName);
    expect(createdKeys[0].publicKey.kid).toBe(leafKeyThumbprint);
    expect(createdKeys[0].certificateChain[0]).toBe(
      pemCertificateToBase64(createdKeys[0].certificateChain[0]),
    );
    expect(createdKeys[0].certificateChain[1]).toBe(
      pemCertificateToBase64(entityCaCertificatePem),
    );
  });
});
