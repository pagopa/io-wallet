import { PID, Disclosure, SdJwt4VC } from "./types";

/**
 * Decode a given SD-JWT to get its readable header and payload
 *
 * @async @function
 * @param token The encoded token
 *
 * @throws A decoding error
 * @returns the parsed token object
 *
 */
export declare function decode(token: string): Promise<SdJwt4VC>;

/**
 * Verify a token is a valid SD-JWT with disclosures.
 * It verifies the first part is a valid JWT.
 * It also verifies each disclosure is well-formed and its values are consistent
 *  with the claims exposed in the SD-JWT.
 * It returns the PID, along with the parsed SD-JWT object and its related disclosures.
 * It throws an error if the validation fails.
 *
 * @async @function
 * @param token The encoded token to be verified
 * @param options
 * @param options.jwksUri URI of the public endpoint of the emitter
 *
 * @throws A verification error
 * @returns The parsed token object along with its related disclosures
 *
 */
export declare function verify(
  token: string,
  options: {
    jwksUri: string;
  }
): Promise<{ pid: PID; sdJwt: SdJwt4VC; disclosures: Disclosure[] }>;

export { PID } from "./types";
