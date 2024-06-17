import { decode } from "cbor-x";
import { describe, expect, it } from "vitest";

import { verifyAssertion } from "../assertion";
import { iOSMockData } from "./config";

describe("iOSAssertionValidation", () => {
  const {
    assertion,
    bundleIdentifier,
    challenge,
    ephemeralKey,
    hardwareKey,
    teamIdentifier,
  } = iOSMockData;

  const data = Buffer.from(assertion, "base64");
  const decodedAssertion = decode(data);

  const clientData = JSON.stringify({ challenge, jwk: ephemeralKey });

  it("should return true", () => {
    const result = verifyAssertion({
      bundleIdentifier,
      clientData,
      decodedAssertion,
      hardwareKey,
      signCount: 0,
      skipSignatureValidation: false,
      teamIdentifier,
    });

    expect(result).resolves.empty;
  });
});
