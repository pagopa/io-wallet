type CountryCode = string;
type EvidenceType = string;
type VerificationAssuranceLevel = string;
type OIDCFederationEntityStatement = unknown;
type UnixTime = number;
type DisclosureHashAlgorithm = "sha-256";

type ObfuscatedDisclosures = { _sd: string[] };
export type VerificationEvidence = Array<{
  type: EvidenceType;
  record: {
    type: string;
    source: {
      organization_name: string;
      organization_id: string;
      country_code: CountryCode;
    };
  };
}>;

export type Verification = {
  trust_framework: "eidas";
  assurance_level: VerificationAssuranceLevel;
};

/**
 * Data structure for the PID.
 * It contains PID claims in plain text as well as verification data with emitter' information
 *
 * @see https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
 */
export type PID = {
  verification: Verification & {
    evidence: VerificationEvidence;
  };
  claims: {
    unique_id: string;
    given_name: string;
    family_name: string;
    birthdate: string;
    place_of_birth: {
      country: CountryCode;
      locality: string;
    };
    tax_id_number: string;
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
      verification: Verification & ObfuscatedDisclosures;
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
