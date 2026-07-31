import { KeyClient } from "@azure/keyvault-keys";
import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { calculateJwkThumbprint } from "jose";
import { describe, expect, it, vi } from "vitest";

import { Key } from "@/keys";

import { CreateIntermediateKeyHandler } from "../create-intermediate-key";
import { publicEcKey } from "./keys";

const logger = {
  format: L.format.simple,
  log: () => () => void 0,
};

const toUint8Array = (value: string) => Buffer.from(value, "base64url");

describe("CreateIntermediateKeyHandler", () => {
  it("should create an intermediate key document from a Key Vault public key", async () => {
    const keyName = "entity-ca-key";
    const certificate = Buffer.from("certificate");
    const certificateBase64 = certificate.toString("base64");
    const keyThumbprint = await calculateJwkThumbprint(publicEcKey);
    const createdKeys: Key[] = [];
    const getKey = vi.fn(() =>
      Promise.resolve({
        key: {
          crv: "P-256",
          kty: "EC",
          x: toUint8Array(publicEcKey.x),
          y: toUint8Array(publicEcKey.y),
        },
        name: keyName,
        properties: {},
      }),
    ) as unknown as Pick<KeyClient, "getKey">["getKey"];
    const getCertificate = vi.fn(() =>
      Promise.resolve({
        cer: certificate,
        name: keyName,
        properties: {},
      }),
    );

    const handler = CreateIntermediateKeyHandler({
      certificateClient: {
        getCertificate,
      },
      input: {
        ...H.request("https://wallet-provider.example.org"),
        body: {
          keyName,
        },
        method: "POST",
      },
      inputDecoder: H.HttpRequest,
      keyClient: {
        getKey,
      },
      keyRepository: {
        createKey: (key) => {
          createdKeys.push(key);
          return TE.right(undefined);
        },
        getKeyByName: () => TE.right(O.none),
      },
      logger,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: expect.objectContaining({
        body: {
          certificate_chain: [certificateBase64],
          id: keyName,
          public_key: {
            crv: publicEcKey.crv,
            kid: keyThumbprint,
            kty: publicEcKey.kty,
            x: publicEcKey.x,
            y: publicEcKey.y,
          },
        },
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      }),
    });

    expect(getKey).toHaveBeenCalledWith(keyName);
    expect(getCertificate).toHaveBeenCalledWith(keyName);
    expect(createdKeys).toEqual([
      {
        certificateChain: [certificateBase64],
        keyName,
        publicKey: {
          ...publicEcKey,
          kid: keyThumbprint,
        },
      },
    ]);
  });
});
