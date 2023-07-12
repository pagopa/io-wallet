import { it, expect, describe } from "vitest";
import { SdJwt4VC, Disclosure, PID } from "../types";

describe("SdJwt4VC", () => {
  it("should accept a valid token", () => {
    // example provided at https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
    const token = {
      header: {
        typ: "vc+sd-jwt",
        alg: "RS512",
        kid: "dB67gL7ck3TFiIAf7N6_7SHvqk0MDYMEQcoGGlkUAAw",
        trust_chain: [
          "NEhRdERpYnlHY3M5WldWTWZ2aUhm ...",
          "eyJhbGciOiJSUzI1NiIsImtpZCI6 ...",
          "IkJYdmZybG5oQU11SFIwN2FqVW1B ...",
        ],
      },
      payload: {
        iss: "https://pidprovider.example.org",
        sub: "NzbLsXh8uDCcd7noWXFZAfHkxZsRGC9Xs...",
        jti: "urn:uuid:6c5c0a49-b589-431d-bae7-219122a9ec2c",
        iat: 1541493724,
        exp: 1541493724,
        status: "https://pidprovider.example.org/status",
        cnf: {
          jwk: {
            kty: "RSA",
            use: "sig",
            n: "1Ta-sE …",
            e: "AQAB",
            kid: "YhNFS3YnC9tjiCaivhWLVUJ3AxwGGz_98uRFaqMEEs",
          },
        },
        type: "PersonIdentificationData",
        verified_claims: {
          verification: {
            _sd: ["OGm7ryXgt5Xzlevp-Hu-UTk0a-TxAaPAobqv1pIWMfw"],
            trust_framework: "eidas",
            assurance_level: "high",
          },
          claims: {
            _sd: [
              "8JjozBfovMNvQ3HflmPWy4O19Gpxs61FWHjZebU589E",
              "BoMGktW1rbikntw8Fzx_BeL4YbAndr6AHsdgpatFCig",
              "CFLGzentGNRFngnLVVQVcoAFi05r6RJUX-rdbLdEfew",
              "JU_sTaHCngS32X-0ajHrd1-HCLCkpT5YqgcfQme168w",
              "VQI-S1mT1Kxfq2o8J9io7xMMX2MIxaG9M9PeJVqrMcA",
              "zVdghcmClMVWlUgGsGpSkCPkEHZ4u9oWj1SlIBlCc1o",
            ],
          },
        },
        _sd_alg: "sha-256",
      },
    };

    const { success } = SdJwt4VC.safeParse(token);

    expect(success).toBe(true);
  });
});

describe("Disclosure", () => {
  it("should accept a valid disclosure", () => {
    // example provided at https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
    const value = [
      "2GLC42sKQveCfGfryNRN9w",
      "evidence",
      [
        {
          type: "electronic_record",
          record: {
            type: "eidas.it.cie",
            source: {
              organization_name: "Ministero dell'Interno",
              organization_id: "m_it",
              country_code: "IT",
            },
          },
        },
      ],
    ];

    const { success } = Disclosure.safeParse(value);
    expect(success).toBe(true);
  });
});

describe("PID", () => {
  it("should accept a valid PID", () => {
    // example based on data provided at https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
    const value = {
      issuer: "https://pidprovider.example.org",
      issuedAt: new Date(1541493724000),
      expiration: new Date(1541493724000),
      verification: {
        trustFramework: "eidas",
        assuranceLevel: "high",
        evidence: [
          {
            type: "electronic_record",
            record: {
              type: "eidas.it.cie",
              source: {
                organization_name: "Ministero dell'Interno",
                organization_id: "m_it",
                country_code: "IT",
              },
            },
          },
        ],
      },
      claims: {
        uniqueId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        givenName: "Mario",
        familyName: "Rossi",
        birthdate: "1980-01-10",
        placeOfBirth: { country: "IT", locality: "Rome" },
        taxIdCode: "TINIT-XXXXXXXXXXXXXXXX",
      },
    };
    const { success } = PID.safeParse(value);
    expect(success).toBe(true);
  });
});
