import * as jwt from "jsonwebtoken";

// Extends Jwt including SD fields
export type SdJwt = jwt.Jwt & {
  payload: jwt.Jwt["payload"] & {
    _sd: string[];
    _sd_alg?: string;
  };
};
