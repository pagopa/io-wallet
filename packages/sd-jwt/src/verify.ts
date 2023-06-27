import * as jwt from "jsonwebtoken";
import * as jose from "jose";
import * as jwks from "jwks-rsa";
import { SdJwt, SupportedAlgorithm } from "./types";

type VerifyOptions = { jwksUri: string };
type VerifyResult = SdJwt;

const supportedAlgorithm = new Set<SupportedAlgorithm>([
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
  const [sdjwt_token /* , ...disclosure_tokens */] = token.split(`~`);

  const parsed = await verifyJWT(sdjwt_token, options);

  if (!jwtIsSdJwt(parsed)) {
    throw new Error(`JWT is not a valid SD-JWT`);
  }

  return parsed;
}

export { verify };
