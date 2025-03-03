export class AndroidAttestationError extends Error {
  name = "AndroidAttestationError";
  constructor(message: string) {
    const finalMessage = `[Android Attestation Error] ${message}`;

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

export class GenericIntegrityCheckError extends Error {
  name = "GenericIntegrityCheckError";
  constructor(msg: string[]) {
    super(msg.join(" | "));
  }
}

export class UnknownAppOriginIntegrityCheckError extends Error {
  name = "UnknownAppOriginIntegrityCheckError";
  constructor() {
    super("INTEGRITY_ERROR_UNKNOWN_APP_ORIGIN");
  }
}

export class OsVersionOutdatedIntegrityCheckError extends Error {
  name = "OsVersionOutdatedIntegrityCheckError";
  constructor() {
    super("INTEGRITY_ERROR_OS_VERSION_OUTDATED");
  }
}
