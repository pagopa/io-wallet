import * as jwt from "jsonwebtoken";

// Extends Jwt including SD fields
export type SdJwt = jwt.Jwt & {
  payload: jwt.Jwt["payload"] & {
    _sd: string[];
    _sd_alg?: string;
  };
};

export type SupportedAlgorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512"
  | "PS256"
  | "PS384"
  | "PS512";
