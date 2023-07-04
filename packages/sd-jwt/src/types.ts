import * as jwt from "jsonwebtoken";

// Extends Jwt including SD fields
export type SdJwt = jwt.Jwt & {
  payload: jwt.Jwt["payload"] & {
    _sd: string[];
    _sd_alg?: string;
  };
};

export type SupportedAlgorithm =
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  | "ES512"
  | "PS256"
  | "PS384"
  | "PS512";

type DisclosureValue = string | Record<string, JSON>;
export type Disclosure = [
  /* salt */ string,
  /* claim name */ string,
  /* claim value */ DisclosureValue
];
