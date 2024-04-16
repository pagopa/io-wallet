import { createHash, createVerify } from "crypto";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import { google } from "googleapis";
import { JWK, KeyLike, exportSPKI, importJWK } from "jose";

export const GoogleAppCredentials = t.type({
  type: NonEmptyString,
  project_id: NonEmptyString,
  private_key_id: NonEmptyString,
  private_key: NonEmptyString,
  client_email: EmailString,
  client_id: NonEmptyString,
  auth_uri: NonEmptyString,
  token_uri: NonEmptyString,
  auth_provider_x509_cert_url: NonEmptyString,
  client_x509_cert_url: NonEmptyString,
  universe_domain: NonEmptyString,
});

export type GoogleAppCredentials = t.TypeOf<typeof GoogleAppCredentials>;

export type VerifyAssertionParams = {
  integrityAssertion: NonEmptyString;
  hardwareSignature: string;
  clientData: string;
  hardwareKey: JWK;
  bundleIdentifier: string;
  googleAppCredentials: GoogleAppCredentials;
  androidPlayIntegrityUrl: string;
};

export const playintegrity = google.playintegrity("v1");

export const verifyAssertion = async (params: VerifyAssertionParams) => {
  const {
    integrityAssertion,
    hardwareSignature,
    clientData,
    hardwareKey,
    bundleIdentifier,
    googleAppCredentials,
    androidPlayIntegrityUrl,
  } = params;

  // First check whether the clientData has been signed correctly with the hardware key
  const joseHardwareKey = (await importJWK(hardwareKey)) as KeyLike;
  const publicHardwareKeyPem = await exportSPKI(joseHardwareKey);

  const clientDataHash = createHash("sha256").update(clientData).digest();

  const verifier = createVerify("SHA256");
  verifier.update(clientDataHash);
  if (!verifier.verify(publicHardwareKeyPem, hardwareSignature)) {
    throw new Error("Invalid hardware signature");
  }

  // Then verify the integrity token
  const jwtClient = new google.auth.JWT(
    googleAppCredentials.client_email,
    undefined,
    googleAppCredentials.private_key,
    [androidPlayIntegrityUrl]
  );

  google.options({ auth: jwtClient });
  const result = await playintegrity.v1.decodeIntegrityToken({
    packageName: bundleIdentifier,
    requestBody: {
      integrityToken: integrityAssertion,
    },
  });

  // TODO: validate also result

  console.log(result);

  throw new Error("Not implemented yet");
};
