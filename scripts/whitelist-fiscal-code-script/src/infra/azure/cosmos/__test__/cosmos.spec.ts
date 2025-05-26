import { CosmosClient } from "@azure/cosmos";
import { describe, expect, it, vi } from "vitest";

import { getCosmosClient } from "../cosmos";

vi.mock("winston", () => ({
  createLogger: vi.fn().mockImplementation(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  })),
  format: {
    combine: vi.fn(),
    printf: vi.fn(),
    simple: vi.fn(),
    timestamp: vi.fn(),
  },
  transports: {
    Console: vi.fn(),
    File: vi.fn(),
  },
}));

vi.mock("@azure/cosmos", () => ({
  CosmosClient: vi.fn().mockImplementation(() => ({})),
}));

describe("Cosmos Module", () => {
  it("should return a cosmos client", () => {
    process.env.DATABASE_CONNECTION_STRING = "valid-connection-string";

    const cosmosClient = getCosmosClient();

    expect(cosmosClient).toBeDefined();
  });

  it("should throw an error", () => {
    vi.mocked(CosmosClient).mockImplementation(() => {
      throw new Error("failed to create cosmos client");
    });

    process.env.DATABASE_CONNECTION_STRING = "valid-connection-string";

    expect(async () => await getCosmosClient()).rejects.toThrow();
  });
});
