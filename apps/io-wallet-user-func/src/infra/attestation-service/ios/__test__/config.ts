import { JwkPublicKey } from "io-wallet-common/jwk";

const challenge = "586e95ef-43a0-43f6-982d-0aeab3611bd9";
const attestation =
  "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";
const keyId = "c5J8KLpibAAxO4d6VeNVzehXoaMpQNaydHprwp7noSY"; // base64url

const bundleIdentifier =
  "org.reactjs.native.example.IoReactNativeIntegrityExample";
const teamIdentifier = "M2X5YQ4BJ7";

const hardwareKey: JwkPublicKey = {
  crv: "P-256",
  kty: "EC",
  x: "z3PTdkV20dwTADp2Xur5AXqLbQz7stUbvRNghMQu1rY",
  y: "Z7MC2EHmlPuoYDRVfy-upr_06-lBYobEk_TCwuSb2ho",
};

const ephemeralKey = {
  crv: "P-256",
  kty: "EC",
  x: "4HNptI-xr2pjyRJKGMnz4WmdnQD_uJSq4R95Nj98b44",
  y: "LIZnSB39vFJhYgS3k7jXE4r3-CoGFQwZtPBIRqpNlrg",
  kid: "vbeXJksM45xphtANnCiG6mCyuU4jfGNzopGuKvogg9c",
};

const assertion =
  "omlzaWduYXR1cmVYRzBFAiAqy9VNUCbjpk9JkkvbURxyRZN8gDYyTZjWH1UNZ7CDkAIhAI/9DpOi7fBeaTDNVDGYlG/2SuYKan/Fzt7a2RQhEDopcWF1dGhlbnRpY2F0b3JEYXRhWCWeDBnBGvrDhnvbN8megL4yLGEW8DZpXwCJQizAYkg3ykAAAAAB";

export const iOSMockData = {
  challenge,
  attestation,
  assertion,
  keyId,
  bundleIdentifier,
  teamIdentifier,
  hardwareKey,
  ephemeralKey,
};
