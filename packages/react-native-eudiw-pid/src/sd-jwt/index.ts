import base64decode from "../lib/base64";
import { PID, Disclosure, SdJwt4VC } from "./types";
import { pidFromToken } from "./converters";

/**
 * Decode a given SD-JWT with Disclosures to get the parsed PID object they define.
 * It ensures provided data is in a valid shape.
 *
 * It DOES NOT verify token signature nor check disclosures are correctly referenced by the SD-JWT.
 * Use {@link verify} instead
 *
 * @function
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 *
 * @returns The validated PID object along with the parsed SD-JWT token and the parsed disclosures
 * @throws A decoding error if the token doesn't resolve in a valid SD-JWT
 * @throws A validation error if the provided data doesn't result in a valid PID
 *
 */
export function decode(token: string): PidWithToken {
  // token are expected in the form "sd-jwt~disclosure0~disclosure1~...~disclosureN"
  const [rawSdJwt, ...rawDisclosures] = token.split("~");

  // get the sd-jwt as object
  // validate it's a valid SD-JWT for Verifiable Credentials
  const [header, payload] = rawSdJwt
    .split(".")
    .slice(0, 2)
    .map(base64decode)
    .map((e) => JSON.parse(e));
  const sdJwt = SdJwt4VC.parse({
    header,
    payload,
  });

  // get disclosures as list of triples
  // validate each triple
  // throw a validation error if at least one fails to parse
  const disclosures = rawDisclosures
    .map(base64decode)
    .map((e) => JSON.parse(e))
    .map((e) => Disclosure.parse(e));

  // compose and validate pid object from input data
  const pid = pidFromToken(sdJwt, disclosures);

  return { pid, sdJwt, disclosures };
}

/**
 * Verify a given SD-JWT with Disclosures to get the parsed PID object they define.
 * Same as {@link decode} plus:
 *   - token signature verification
 *   - ensure disclosures are well-defined inside the SD-JWT
 *
 * @async @function
 *
 * @todo implement signature validation
 * @todo check disclosures in sd-jwt
 *
 * @param token The encoded token that represents a valid sd-jwt for verifiable credentials
 * @param {VerifyOptions} options
 *
 * @returns {VerifyResult} The validated PID object along with the parsed SD-JWT token and the parsed disclosures
 * @throws A decoding error if the token doesn't resolve in a valid SD-JWT
 * @throws A validation error if the provided data doesn't result in a valid PID
 * @throws A validation error if the provided disclosures are not defined in the SD-JWT
 * @throws Invalid signature error if the token signature is not valid
 *
 */
export async function verify(
  token: string,
  options: VerifyOptions // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<VerifyResult> {
  // TODO: signature validation

  // get decoded data
  // eslint-disable-next-line sonarjs/prefer-immediate-return
  const decoded = decode(token);

  // TODO: check disclosures in sd-jwt

  return decoded;
}

/**
 * Options for {@link verify}
 */
export type VerifyOptions = {
  /** URI of the public endpoint of the issuer */
  jwksUri: string;
};

type PidWithToken = {
  // The object with the parsed data for PID
  pid: PID;
  // The object with the parsed SD-JWT token that shipped the PID. It will be needed to present PID data.
  sdJwt: SdJwt4VC;
  // Parsed list of discloures with PID values. It will be needed to present PID data.
  disclosures: Disclosure[];
};

/**
 * Result object for {@link verify}
 */
export type VerifyResult = PidWithToken;

export { PID } from "./types";
