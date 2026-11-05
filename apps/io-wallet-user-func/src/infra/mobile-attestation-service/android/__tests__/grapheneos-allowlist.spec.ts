import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import {
  GRAPHENEOS_ALLOWED_SIGNERS,
  GRAPHENEOS_ALLOWLIST_SNAPSHOT,
  GrapheneOsAllowlist,
} from "../grapheneos-allowlist";

const readFixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, "fixtures", name), "utf-8");

describe("GrapheneOsAllowlist", () => {
  it("should use the bundled snapshot until a signed list is applied", () => {
    const allowlist = new GrapheneOsAllowlist();
    expect(allowlist.getTimestamp()).toBe(0);
    expect([...allowlist.getKeys()]).toEqual(
      GRAPHENEOS_ALLOWLIST_SNAPSHOT.verifiedBootKeys,
    );
  });

  it("should pin the allowed_signers published by GrapheneOS", () => {
    expect(GRAPHENEOS_ALLOWED_SIGNERS).toBe(
      readFixture("grapheneos-allowed_signers").trim(),
    );
  });

  it("should verify the real list signed by GrapheneOS", () => {
    const allowlist = new GrapheneOsAllowlist();
    allowlist.apply(
      readFixture("grapheneos-attestation.json"),
      readFixture("grapheneos-attestation.json.sig"),
    );
    expect(allowlist.getTimestamp()).toBe(1776709772);
    expect([...allowlist.getKeys()].sort()).toEqual(
      [...GRAPHENEOS_ALLOWLIST_SNAPSHOT.verifiedBootKeys].sort(),
    );
  });

  it("should reject a list not signed by the pinned key", () => {
    const allowlist = new GrapheneOsAllowlist();
    expect(() =>
      allowlist.apply(
        readFixture("attestation.json"),
        readFixture("attestation.json.sig"),
      ),
    ).toThrow("not been made by an allowed signer");
    expect(allowlist.getTimestamp()).toBe(0);
  });

  it("should reject a tampered list", () => {
    const allowlist = new GrapheneOsAllowlist();
    expect(() =>
      allowlist.apply(
        readFixture("grapheneos-attestation.json").replace("1776709772", "1"),
        readFixture("grapheneos-attestation.json.sig"),
      ),
    ).toThrow("Invalid SSH signature");
  });

  it("should reject a downgrade to an older signed list", () => {
    // Fixtures signed with a test only key
    const allowlist = new GrapheneOsAllowlist({
      allowedSigners: readFixture("allowed_signers"),
    });
    allowlist.apply(
      readFixture("attestation.json"),
      readFixture("attestation.json.sig"),
    );
    expect(() =>
      allowlist.apply(
        readFixture("attestation-old.json"),
        readFixture("attestation-old.json.sig"),
      ),
    ).toThrow("downgrade detected");
    expect(allowlist.getTimestamp()).toBe(1761177600);
  });
});
