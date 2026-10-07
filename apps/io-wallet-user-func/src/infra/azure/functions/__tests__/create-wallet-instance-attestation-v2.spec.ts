import * as H from "@pagopa/handler-kit";
import { describe, expect, it, vi } from "vitest";

import { CreateWalletInstanceAttestationV2Function } from "../create-wallet-instance-attestation-v2";

describe("CreateWalletInstanceAttestationV2Function", () => {
  it("passes malformed JSON to body validation and returns Problem JSON", async () => {
    const parseRequest = vi.fn(async (body: unknown) => {
      expect(body).toBeUndefined();
      throw new H.ValidationError(["invalid body"]);
    });
    const dependencies = {
      parseRequest,
      sendTelemetry: vi.fn(async () => void 0),
    };
    const context = { error: vi.fn() };
    const request = {
      json: vi.fn(async () => Promise.reject(new Error("bad json"))),
    };
    const handler = CreateWalletInstanceAttestationV2Function(
      dependencies as never,
    );

    const response = await handler(request as never, context as never);

    expect(parseRequest).toHaveBeenCalledOnce();
    expect(response.status).toBe(422);
    expect(response.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/problem+json" }),
    );
    expect(response.jsonBody).toEqual(
      expect.objectContaining({
        type: "/problem/validation-error",
        violations: ["invalid body"],
      }),
    );
    expect(context.error).toHaveBeenCalledOnce();
  });

  it("returns the telemetry failure as a 500 Problem JSON response", async () => {
    const dependencies = {
      parseRequest: vi.fn(async () => {
        throw new Error("stop");
      }),
      sendTelemetry: vi.fn(async () => {
        throw new Error("telemetry");
      }),
    };
    const context = { error: vi.fn() };
    const handler = CreateWalletInstanceAttestationV2Function(
      dependencies as never,
    );

    const response = await handler(
      { json: async () => ({}) } as never,
      context as never,
    );

    expect(response.status).toBe(500);
    expect(response.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/problem+json" }),
    );
  });
});
