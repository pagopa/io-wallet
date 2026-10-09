import type { SignAlgorithm } from "@/infra/crypto/signer";

export interface KeyOperations {
  sign: (
    keyName: string,
    algorithm: SignAlgorithm,
    digest: string,
  ) => Promise<string>;
}

export class KeyOperationsClient implements KeyOperations {
  constructor(
    private readonly url: string,
    private readonly requestTimeout: number,
  ) {}

  sign = async (
    keyName: string,
    algorithm: SignAlgorithm,
    digest: string,
  ): Promise<string> => {
    const endpoint = new URL(
      `${encodeURIComponent(keyName)}/signatures`,
      `${this.url.replace(/\/+$/, "")}/`,
    );
    const response = await fetch(endpoint, {
      body: JSON.stringify({ alg: algorithm, value: digest }),
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
      !("kid" in result) ||
      typeof result.kid !== "string" ||
      !("value" in result) ||
      typeof result.value !== "string" ||
      result.value.length === 0
    ) {
      throw new Error(
        "Signing response did not contain a key ID and signature",
      );
    }

    return result.value;
  };
}
