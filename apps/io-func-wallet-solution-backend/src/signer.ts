import * as E from "fp-ts/Either";
import { JwkPublicKey } from "./jwk";

export type Signer = {
  getPublicKeys: () => E.Either<Error, JwkPublicKey[]>;
  getSupportedSignAlgorithms: () => E.Either<Error, string[]>;
};
