import * as H from "@pagopa/handler-kit";
import * as L from "@pagopa/logger";
import { Crypto } from "@peculiar/webcrypto";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { CertificateRepository } from "@/certificates";

import { GenerateCertificateChainHandler } from "../generate-certificate-chain";

describe("GenerateCertificateChainHandler", () => {
  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  const federationEntitySigningKeys = [
    {
      crv: "P-256",
      d: "vIZcXqDlb_heIreOc6_Lp0ztMDSLuh0viNjKAoDLO7A",
      kid: "kid1",
      kty: "EC" as const,
      x: "1M7bB-iprGYgN9ovAeShw6GAKkcFRB5fugL7qVTZC0I",
      y: "xnC6buXz1bUVmEE1WQVZ3aCIpdqY2g0Gf67qW2OmSaU",
    },
    {
      crv: "P-256",
      d: "0RUbY4r5XP1DXa3AH4vuslSH28Xo-evkoyihsv_AsHk",
      kid: "kid2",
      kty: "EC" as const,
      x: "7_5uFpC1OTaEvBAjJetpgNcMKWTHNhGI2HPRjDH9xrQ",
      y: "wvuQpdK65E-pF7QlTk9-UBc5-UCuARcw2L7xPlozyKc",
    },
  ];

  const certificateRepository: CertificateRepository = {
    getCertificateChainByKid: () => TE.right(O.some(["cert1", "cert2"])),
    insertCertificateChain: () => TE.right(undefined),
  };

  it("should return a 200 HTTP response with the certificate chain on success", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        issuer_key_id: "kid1",
        subject_key: {
          crv: "P-256",
          kid: "kid0",
          kty: "EC",
          x: "DNbpbPXQZfE8kq4y_WCo72oMfBBabumy-OoMZr0vZ4U",
          y: "VzW_FeSVbJA3gTZWW7fvEh8yYQgXYSLqy0nIvNhUOVE",
        },
      },
    };

    const handler = GenerateCertificateChainHandler({
      certificate: {
        crypto: new Crypto(),
        issuer: "C=IT, ST=Lazio, L=Roma, O=Organization, CN=commonName.it",
        subject: "C=IT, ST=Lazio, L=Roma, O=Organization, CN=commonName.it",
      },
      certificateRepository,
      federationEntitySigningKeys,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: expect.arrayContaining(["cert1", "cert2"]),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        statusCode: 200,
      },
    });
  });

  it("should return a 500 HTTP response when kid parameter is not included in federationEntitySigningKeys", async () => {
    const req = {
      ...H.request("https://wallet-provider.example.org"),
      body: {
        issuer_key_id: "kid4783",
        subject_key: {
          crv: "P-256",
          kid: "kid0",
          kty: "EC",
          x: "DNbpbPXQZfE8kq4y_WCo72oMfBBabumy-OoMZr0vZ4U",
          y: "VzW_FeSVbJA3gTZWW7fvEh8yYQgXYSLqy0nIvNhUOVE",
        },
      },
    };

    const handler = GenerateCertificateChainHandler({
      certificate: {
        crypto: new Crypto(),
        issuer: "C=IT, ST=Lazio, L=Roma, O=Organization, CN=commonName.it",
        subject: "C=IT, ST=Lazio, L=Roma, O=Organization, CN=commonName.it",
      },
      certificateRepository,
      federationEntitySigningKeys,
      input: req,
      inputDecoder: H.HttpRequest,
      logger,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
      right: {
        body: {
          detail: "Error",
          status: 500,
          title: "Internal Server Error",
        },
        headers: expect.objectContaining({
          "Content-Type": "application/problem+json",
        }),
        statusCode: 500,
      },
    });
  });
});
