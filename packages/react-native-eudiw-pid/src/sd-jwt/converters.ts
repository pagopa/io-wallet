import { Disclosure, SdJwt4VC, PID } from "./types";

export function pidFromToken(sdJwt: SdJwt4VC, disclosures: Disclosure[]): PID {
  return PID.parse({
    issuer: sdJwt.payload.iss,
    issuedAt: new Date(sdJwt.payload.iat * 1000),
    expiration: new Date(sdJwt.payload.exp * 1000),
    verification: {
      trustFramework:
        sdJwt.payload.verified_claims.verification.trust_framework,
      assuranceLevel:
        sdJwt.payload.verified_claims.verification.assurance_level,
      evidence: getValueFromDisclosures(disclosures, "evidence"),
    },
    claims: {
      uniqueId: getValueFromDisclosures(disclosures, "unique_id"),
      givenName: getValueFromDisclosures(disclosures, "given_name"),
      familyName: getValueFromDisclosures(disclosures, "family_name"),
      birthdate: getValueFromDisclosures(disclosures, "birthdate"),
      placeOfBirth: getValueFromDisclosures(disclosures, "place_of_birth"),
      taxIdCode: getValueFromDisclosures(disclosures, "tax_id_code"),
    },
  });
}

function getValueFromDisclosures(disclosures: Disclosure[], claimName: string) {
  const value = disclosures.find(([, name]) => name === claimName)?.[2];
  // value didn't found, we return nothing
  if (!value) {
    return undefined;
  }
  // value is not a string, it's probably fine
  if (typeof value !== "string") {
    return value;
  }
  // value is a string, we try to parse it
  // maybe it's a serialized object
  try {
    return JSON.parse(value);
  } catch (error) {
    // It's definitely a string
    return value;
  }
}
