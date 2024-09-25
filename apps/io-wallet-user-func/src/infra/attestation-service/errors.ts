import { X509Certificate } from "crypto";
import { AndroidDeviceDetails } from "io-wallet-common/device-details";

export class AndroidAttestationError extends Error {
  name = "AndroidAttestationError";
  constructor(
    message: string,
    {
      deviceDetails,
      x509Chain,
    }: {
      deviceDetails?: AndroidDeviceDetails;
      x509Chain?: readonly X509Certificate[];
    },
  ) {
    const finalMessage =
      `[Android Attestation Error] ${message}` +
      (x509Chain ? `\nx509Chain: ${JSON.stringify(x509Chain)}` : "") +
      (deviceDetails
        ? `\nDevice details: ${JSON.stringify(deviceDetails)}`
        : "");

    super(finalMessage);
  }
}

export class AndroidAssertionError extends Error {
  name = "AndroidAssertionError";
  constructor(message: string) {
    super(`[Android Assertion Error] ${message}`);
  }
}

export class IosAssertionError extends Error {
  name = "IosAssertionError";
  constructor(message: string) {
    super(`[iOS Assertion Error] ${message}`);
  }
}

export class IosAttestationError extends Error {
  name = "IosAttestationError";
  constructor(message: string) {
    super(`[iOS Attestation Error] ${message}`);
  }
}
