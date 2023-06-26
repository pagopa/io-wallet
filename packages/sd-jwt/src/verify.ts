import * as jwt from "jsonwebtoken";
import * as jose from "jose";
import * as jwks from "jwks-rsa";
import { Disclosure, SdJwt, SupportedAlgorithm } from "./types";
import { hash } from "./lib/crypto";

type VerifyOptions = { jwksUri: string };
type VerifyResult = [SdJwt, ...Disclosure[]];

const supportedAlgorithm = new Set<SupportedAlgorithm>([
  "HS256",
  "HS384",
  "HS512",
  "RS256",
  "RS384",
  "RS512",
  "ES256",
  "ES384",
  "ES512",
  "PS256",
  "PS384",
  "PS512",
]);
function isSupportedAlgorithm(alg: string): alg is SupportedAlgorithm {
  return supportedAlgorithm.has(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alg as any /* to look for unknown value into a typed set */
  );
}

// Check a jwt has the attributes defined in the SD-JWT specification
// It only support first level of disclosure for now
function jwtIsSdJwt(j: jwt.Jwt): j is SdJwt {
  // every condition expect this, we can short-circuit the check
  if (typeof j.payload !== "object") {
    return false;
  }

  const hasValidSd =
    "_sd" in j.payload &&
    Array.isArray(j.payload["_sd"]) && // eslint-disable-line @typescript-eslint/dot-notation
    j.payload["_sd"].every((s) => typeof s === "string"); // eslint-disable-line @typescript-eslint/dot-notation
  const hasValidSdAlg =
    "_sd_alg" in j.payload && typeof j.payload["_sd_alg"] === "string"; // eslint-disable-line @typescript-eslint/dot-notation
  const hasNotSdAlg = !("_sd_alg" in j.payload);

  return hasValidSd && (hasValidSdAlg || hasNotSdAlg);
}

/**
 * Verify a JWT is structurally valid and its signature is verified.
 * It returns the parsed JWT object.
 * It throws an error if the validation fails
 *
 * @param token the encoded JWT token to be verified
 * @param options
 * @param options.jwksUri URI of the public endpoint of the emitter
 *
 * @throws a verification error
 * @returns the parsed token object
 */
async function verifyJWT(
  token: string,
  { jwksUri }: VerifyOptions
): Promise<jwt.Jwt> {
  // parse header to extract signing informations
  const { kid, alg } = jose.decodeProtectedHeader(token);

  // check that the hashing algorithm is defined and supported
  if (!alg || !isSupportedAlgorithm(alg)) {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }

  // retrieve the signing key from the public JWK endpoint
  const signingKey = await new jwks.JwksClient({
    cache: true,
    jwksUri,
    rateLimit: false,
  }).getSigningKey(kid);

  // verify the whole token
  return jwt.verify(token, signingKey.getPublicKey(), {
    complete: true,
    algorithms: [alg],
  });
}

/**
 * Parse an encoded disclosure token into a triple [salt, claim name, claim value].
 *
 * @example
 * // returns ["rSLuznhiLPBDRZE1CZ88KQ", "sub", "john_doe_42"]
 * parseDisclosureToken("WyJyU0x1em5oaUxQQkRSWkUxQ1o4OEtRIiwgInN1YiIsICJqb2huX2RvZV80MiJd")
 *
 * @param token A base64 string representing the disclosure
 * @returns The triple representing the parsed disclosure
 * @throws An error in case the token is failed to decode and parse
 */
function parseDisclosureToken(token: string): Disclosure {
  // token is a base64 string
  const decoded = atob(token);
  const parsed = JSON.parse(decoded);

  // validate the structure:
  // - is a triple
  // - first two elements are string
  // - last element is either a string or a record
  if (
    Array.isArray(parsed) &&
    parsed.length === 3 &&
    typeof parsed[0] === "string" &&
    typeof parsed[1] === "string" &&
    (typeof parsed[2] === "string" || typeof parsed[2] === "object")
  ) {
    return parsed as Disclosure;
  }
  throw new Error(`Failed to validate disclosure token: ${token}`);
}

/**
 * Verify provided disclosures are structurally valid and each one is referenced as a claim inside the SD-JWT.
 *
 * @param disclosure_tokens The complete list of disclosures
 * @param sdjwt A parsed SD-JWT object
 *
 * @returns The parsed list of disclosures
 * @throws An error if disclosures are malformed or not valid according to SD-JWT
 */
function verifyDisclosures(
  disclosure_tokens: string[],
  sdjwt: SdJwt
): Disclosure[] {
  // As by specification, if the _sd_alg claim is not present, a default value of sha-256 is used
  // https://www.ietf.org/archive/id/draft-ietf-oauth-selective-disclosure-jwt-04.html#name-hash-function-claim
  const hashingAlgorithm = sdjwt.payload._sd_alg ?? "sha-256"; // eslint-disable-line no-underscore-dangle

  // FIXME: supporting sha-256 only so far
  if (hashingAlgorithm !== "sha-256") {
    throw new Error(
      `Unsupported hashing algorithm in _sd_alg: ${hashingAlgorithm}`
    );
  }

  // verify disclosure first trying to parse each
  // calculate hash while iterating
  const parsed_disclosures_map = disclosure_tokens.reduce((p, token) => {
    const parsed = parseDisclosureToken(token);
    const digest = hash(hashingAlgorithm, token, parsed[0]);
    return {
      ...p,
      [digest]: { parsed, token },
    };
  }, {} as Record<string, { parsed: Disclosure; token: string }>);

  // each and every disclosure is found in the sdjwt
  // FIXME: iterate over every field of the SD-JWT to support structured and recursive disclosures
  Object.entries(parsed_disclosures_map).forEach(([digest, { token }]) => {
    // eslint-disable-next-line no-underscore-dangle
    if (!sdjwt.payload._sd.includes(digest)) {
      throw new Error(
        `SD-JWT does not include disclosure ${token}, cannot find digest ${digest}`
      );
    }
  });

  return Object.values(parsed_disclosures_map).map(({ parsed }) => parsed);
}

/**
 * Verify a token is a valid SD-JWT with disclosures.
 * It verifies the first part is a valid JWT.
 * It also verifies each disclosure is well-formed and their values are consistent
 *  with the claims exposed in the SD-JWT.
 * It returns the parsed JWT object along with its related disclosures.
 * It throws an error if the validation fails.
 *
 * @param token The encoded token to be verified
 * @param options
 * @param options.jwksUri URI of the public endpoint of the emitter
 *
 * @throws a verification error
 * @returns the parsed token object along with its related disclosures
 */
async function verify(
  token: string,
  options: VerifyOptions
): Promise<VerifyResult> {
  const [sdjwt_token, ...disclosure_tokens] = token.split(`~`).filter(Boolean);

  const parsed_sdjwt = await verifyJWT(sdjwt_token, options);

  if (!jwtIsSdJwt(parsed_sdjwt)) {
    throw new Error(`JWT is not a valid SD-JWT`);
  }

  const parsed_disclosures = verifyDisclosures(disclosure_tokens, parsed_sdjwt);

  return [parsed_sdjwt, ...parsed_disclosures];
}

export { verify };
