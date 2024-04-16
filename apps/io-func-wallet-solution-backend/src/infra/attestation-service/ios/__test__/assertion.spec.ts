import { it, expect, describe } from "vitest";
import { decode } from "cbor-x";

import { iOSMockData } from "./config";
import { verifyAssertion } from "../assertion";

describe("iOSAssertionValidation", async () => {
  const {
    challenge,
    assertion,
    hardwareKey,
    bundleIdentifier,
    teamIdentifier,
    ephemeralKey,
  } = iOSMockData;

  const data = Buffer.from(assertion, "base64");
  const decodedAssertion = decode(data);

  const clientData = JSON.stringify({ challenge, jwk: ephemeralKey });

  it("should return true", async () => {
    const result = await verifyAssertion({
      decodedAssertion,
      clientData,
      hardwareKey,
      bundleIdentifier,
      teamIdentifier,
      signCount: 0,
    });

    expect(result).toEqual(true);
  });
});
