import { z } from "zod";

const UnixTime = z.number().min(0).max(2147483647000);
type UnixTime = z.infer<typeof UnixTime>;

type ObfuscatedDisclosures = z.infer<typeof ObfuscatedDisclosures>;
const ObfuscatedDisclosures = z.object({ _sd: z.array(z.string()) });

/**
 * A triple of values in the form of {salt, claim name, claim value} that represent a parsed disclosure.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-oauth-selective-disclosure-jwt-04
 * @see https://vcstuff.github.io/draft-terbu-sd-jwt-vc/draft-terbu-oauth-sd-jwt-vc.html
 */
export type Disclosure = z.infer<typeof Disclosure>;
export const Disclosure = z.tuple([
  /* salt */ z.string(),
  /* claim name */ z.string(),
  /* claim value */ z.unknown(),
]);

const VerificationEvidence = z.object({
  type: z.string(),
  record: z.object({
    type: z.string(),
    source: z.object({
      organization_name: z.string(),
      organization_id: z.string(),
      country_code: z.string(),
    }),
  }),
});
type Verification = z.infer<typeof Verification>;
const Verification = z.object({
  trustFramework: z.literal("eidas"),
  assuranceLevel: z.string(),
  evidence: z.array(VerificationEvidence),
});

/**
 * Data structure for the PID.
 * It contains PID claims in plain text as well as verification data with the issuer's information
 *
 * @see https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
 */
export type PID = z.infer<typeof PID>;
export const PID = z.object({
  issuer: z.string(),
  issuedAt: z.date(),
  expiration: z.date(),
  verification: Verification,
  claims: z.object({
    uniqueId: z.string(),
    givenName: z.string(),
    familyName: z.string(),
    birthdate: z.string(),
    placeOfBirth: z.object({
      country: z.string(),
      locality: z.string(),
    }),
    taxIdCode: z.string(),
  }),
});

export type SdJwt4VC = z.infer<typeof SdJwt4VC>;
export const SdJwt4VC = z.object({
  header: z.object({
    typ: z.literal("vc+sd-jwt"),
    alg: z.string(),
    kid: z.string(),
    trust_chain: z.array(z.string()),
  }),
  payload: z.object({
    iss: z.string(),
    sub: z.string(),
    jti: z.string(),
    iat: UnixTime,
    exp: UnixTime,
    status: z.string(),
    cnf: z.object({
      jwk: z.object({
        kty: z.union([z.literal("RSA"), z.literal("EC")]),
        use: z.literal("sig"),
        n: z.string(),
        e: z.string(),
      }),
    }),
    type: z.literal("PersonIdentificationData"),
    verified_claims: z.object({
      verification: z.intersection(
        z.object({
          trust_framework: z.literal("eidas"),
          assurance_level: z.string(),
        }),
        ObfuscatedDisclosures
      ),
      claims: ObfuscatedDisclosures,
    }),
    _sd_alg: z.literal("sha-256"),
  }),
});
