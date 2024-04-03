import { it, expect, describe } from "vitest";
import { decode } from "cbor-x";

import { iOSMockAttestationData } from "./config";
import { verifyAssertion } from "../assertion";

describe("iOSAssertionValidation", async () => {
  const {
    challenge,
    assertion,
    hardwareKey,
    bundleIdentifier,
    teamIdentifier,
    ephemeralKey,
  } = iOSMockAttestationData;

  const data = Buffer.from(assertion, "base64");
  const decodedAssertion = decode(data);

  const payload = JSON.stringify({ challenge, jwk: ephemeralKey });

  it("should return true", async () => {
    const result = await verifyAssertion({
      decodedAssertion,
      payload,
      hardwareKey,
      bundleIdentifier,
      teamIdentifier,
      signCount: 0,
    });

    expect(result).toEqual(true);
  });
});
