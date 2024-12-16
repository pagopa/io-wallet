import { CredentialRepository } from "@/credential";
import * as L from "@pagopa/logger";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as appInsights from "applicationinsights";
import * as TE from "fp-ts/TaskEither";
import { describe, expect, it } from "vitest";

import { CallPidIssuerRevokeApiHandler } from "../call-pid-issuer-revoke-api";

const pidIssuerClient: CredentialRepository = {
  revokeAllCredentials: () => TE.right(undefined),
};

const telemetryClient: appInsights.TelemetryClient = {
  trackException: () => void 0,
} as unknown as appInsights.TelemetryClient;

describe("CallPidIssuerRevokeApiHandler", () => {
  const logger = {
    format: L.format.simple,
    log: () => () => void 0,
  };

  it("should return a 200 HTTP response on success", async () => {
    const handler = CallPidIssuerRevokeApiHandler({
      credentialRepository: pidIssuerClient,
      input: "AAAPPP00D55H501J",
      inputDecoder: FiscalCode,
      logger,
      telemetryClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Right",
    });
  });

  it("should return a 422 HTTP response when the input is not a valid fiscal code", async () => {
    const handler = CallPidIssuerRevokeApiHandler({
      credentialRepository: pidIssuerClient,
      input: "foo",
      inputDecoder: FiscalCode,
      logger,
      telemetryClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Left",
      left: expect.objectContaining({
        name: "ValidationError",
      }),
    });
  });

  it("should return a 500 HTTP response when revokeAllCredentials returns error", async () => {
    const pidIssuerClientThatFailsOnRevoke: CredentialRepository = {
      revokeAllCredentials: () => TE.left(new Error("foo!")),
    };
    const handler = CallPidIssuerRevokeApiHandler({
      credentialRepository: pidIssuerClientThatFailsOnRevoke,
      input: "AAAPPP00D55H501J",
      inputDecoder: FiscalCode,
      logger,
      telemetryClient,
    });

    await expect(handler()).resolves.toEqual({
      _tag: "Left",
      left: expect.objectContaining({
        message: "foo!",
        name: "Error",
      }),
    });
  });
});
