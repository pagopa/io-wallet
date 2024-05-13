import { it, expect, describe } from "vitest";
import { decode } from "cbor-x";

import { iOSMockData } from "./config";
import { verifyAssertion } from "../assertion";

describe("iOSAssertionValidation", () => {
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
    const result = verifyAssertion({
      decodedAssertion,
      clientData,
      hardwareKey,
      bundleIdentifier,
      teamIdentifier,
      signCount: 0,
    });

    await expect(result).resolves.empty;
  });
});
