import { JwksRepository } from "../../domain/signer";
import { ECKey, ECPrivateKeyWithKid } from "../../domain/jwk";

export const makeJwksRepository = (
  jwks: readonly ECPrivateKeyWithKid[],
): JwksRepository => ({
  get: () => {
    if (jwks.length === 0) {
      throw new Error("Unable to find valid JWK key pair");
    }

    const jwkKeyPair = {
      public: { ...jwks[0], kty: "EC" } as ECKey & {
        kid: string;
        readonly kty: "EC";
      },
      private: { ...jwks[0], kty: "EC" } as ECPrivateKeyWithKid & {
        kid: string;
        readonly kty: "EC";
      },
    };

    return jwkKeyPair;
  },
});
