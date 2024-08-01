import { AndroidDeviceDetails } from "./android";

export class AndroidAttestationError extends Error {
  name = "AndroidAttestationError";
  constructor(message: string, deviceDetails?: AndroidDeviceDetails) {
    super(
      deviceDetails
        ? `[Android Attestation Error] ${message} - Device details: ${JSON.stringify(deviceDetails)}`
        : `[Android Attestation Error] ${message}`,
    );
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
