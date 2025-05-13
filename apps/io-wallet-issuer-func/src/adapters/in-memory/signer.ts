import { ECKey, ECPrivateKeyWithKid } from "../../domain/jwk";
import { JwksRepository } from "../../domain/signer";

export const makeJwksRepository = (
  jwks: readonly ECPrivateKeyWithKid[],
): JwksRepository => ({
  get: () => {
    if (jwks.length === 0) {
      throw new Error("Unable to find valid JWK key pair");
    }

    const jwkKeyPair = {
      private: { ...jwks[0], kty: "EC" } as {
        kid: string;
        readonly kty: "EC";
      } & ECPrivateKeyWithKid,
      public: { ...jwks[0], kty: "EC" } as {
        kid: string;
        readonly kty: "EC";
      } & ECKey,
    };

    return jwkKeyPair;
  },
});
