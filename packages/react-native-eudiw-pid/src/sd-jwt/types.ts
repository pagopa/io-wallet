type CountryCode = string;
type EvidenceType = string;
type OIDCFederationEntityStatement = unknown;
type UnixTime = number;
type DisclosureHashAlgorithm = "sha-256";

type ObfuscatedDisclosures = { _sd: string[] };
type VerificationEvidence = Array<{
  type: EvidenceType;
  record: {
    type: string;
    source: {
      organizationName: string;
      organizationId: string;
      countryCode: CountryCode;
    };
  };
}>;

/**
 * Contain the information as sub claims regarding the identity proofing evidence during the issuing phase of the PID
 *
 * @see https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Verification = {
  trustFramework: "eidas";
  assuranceLevel: string;
  evidence: VerificationEvidence;
};

/**
 * Data structure for the PID.
 * It contains PID claims in plain text as well as verification data with emitter' information
 *
 * @see https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
 */
export type PID = {
  issuer: string;
  issuedAt: Date;
  expiration: Date;
  verification: Verification;
  claims: {
    uniqueId: string;
    givenName: string;
    familyName: string;
    birthdate: string;
    placeOfBirth: {
      country: CountryCode;
      locality: string;
    };
    taxIdNumber: string;
  };
};

export type SdJwt4VC = {
  header: {
    typ: "vc+sd-jwt";
    alg: string;
    kid: string;
    trust_chain: OIDCFederationEntityStatement[];
  };
  payload: {
    iss: string;
    sub: string;
    jti: string;
    iat: UnixTime;
    exp: UnixTime;
    status: string;
    cnf: {
      jwk: {
        kty: "RSA" | "EC";
        use: "sig";
        n: string;
        e: string;
      };
    };
    type: "PersonIdentificationData";
    verified_claims: {
      verification: {
        trust_framework: "eidas";
        assurance_level: string;
      } & ObfuscatedDisclosures;
      claims: ObfuscatedDisclosures;
    };
    _sd_alg: DisclosureHashAlgorithm;
  };
};

/**
 * A triple of values in the form of {salt, claim name, claim value} that represent a parsed disclosure.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-oauth-selective-disclosure-jwt-04
 * @see https://vcstuff.github.io/draft-terbu-sd-jwt-vc/draft-terbu-oauth-sd-jwt-vc.html
 */
export type Disclosure = [
  /* salt */ string,
  /* claim name */ string,
  /* claim value */ string | Record<string, JSON>
];
