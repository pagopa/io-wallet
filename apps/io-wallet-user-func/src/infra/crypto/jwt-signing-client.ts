import type { SignAlgorithm } from "@/infra/crypto/signer";

export interface JwtSigner {
  sign: (
    keyName: string,
    algorithm: SignAlgorithm,
    signingInput: string,
  ) => Promise<string>;
}

export class JwtSigningClient implements JwtSigner {
  constructor(
    private readonly url: string,
    private readonly requestTimeout: number,
  ) {}

  sign = async (
    keyName: string,
    algorithm: SignAlgorithm,
    signingInput: string,
  ): Promise<string> => {
    const response = await fetch(this.url, {
      body: JSON.stringify({ algorithm, keyName, signingInput }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(this.requestTimeout),
    });

    if (!response.ok) {
      throw new Error(
        `Signing request failed with HTTP ${response.status}: ${await response.text()}`,
      );
    }

    const result = await response.json();
    if (
      typeof result !== "object" ||
      result === null ||
      !("signedJwt" in result) ||
      typeof result.signedJwt !== "string" ||
      result.signedJwt.length === 0
    ) {
      throw new Error("Signing response did not contain a signedJwt");
    }

    return result.signedJwt;
  };
}
