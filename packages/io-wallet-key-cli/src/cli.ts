#!/usr/bin/env node
import { DefaultAzureCredential } from "@azure/identity";
import { parseArgs } from "node:util";

import {
  completeIntermediate,
  createCertificateClient,
  createCryptographyClient,
  createKeyClient,
  createLeafKey,
  getDatabase,
} from "./provisioning.js";

try {
  process.loadEnvFile();
} catch {
  // No .env file found; environment variables may already be set in the shell.
}

const requireValue = (value: string | undefined, label: string) => {
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required ${label}`);
  }
  return value;
};

const required = (options: Record<string, string | undefined>, name: string) =>
  requireValue(options[name], `option --${name}`);

const requiredEnv = (name: string) =>
  requireValue(process.env[name], `environment variable ${name}`);

const printUsage = () => {
  process.stdout.write(`Usage:
  Environment variables (required for every command):
    KEY_PROVISIONING_VAULT_NAME
    KEY_PROVISIONING_COSMOS_ENDPOINT
    KEY_PROVISIONING_DATABASE

  key-provisioning complete-intermediate --name <name> --intermediate-certificate <base64-or-pem> --trust-anchor-certificate <base64-or-pem>
  key-provisioning create-leaf --issuer-key-name <name> --name <name>
`);
};

const certificateInputToDer = (certificate: string) => {
  const normalized = certificate.replace(
    /-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g,
    "",
  );
  return Buffer.from(normalized, "base64");
};

const options = {
  "intermediate-certificate": { type: "string" as const },
  "issuer-key-name": { type: "string" as const },
  name: { type: "string" as const },
  "trust-anchor-certificate": { type: "string" as const },
};

const main = async () => {
  const command = process.argv[2];
  if (command === undefined || command === "--help" || command === "help") {
    printUsage();
    return;
  }
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options,
    strict: true,
  });
  const vaultName = requiredEnv("KEY_PROVISIONING_VAULT_NAME");
  const cosmosEndpoint = requiredEnv("KEY_PROVISIONING_COSMOS_ENDPOINT");
  const databaseName = requiredEnv("KEY_PROVISIONING_DATABASE");
  process.stdout.write(
    `Using vault-name=${vaultName} cosmos-endpoint=${cosmosEndpoint} database=${databaseName}\n`,
  );
  const vault = `https://${vaultName}.vault.azure.net`;
  const credential = new DefaultAzureCredential();

  const certificateClient = createCertificateClient(vault, credential);
  const keyClient = createKeyClient(vault, credential);
  const cryptographyClient = createCryptographyClient(vault, credential);
  const database = getDatabase(cosmosEndpoint, databaseName, credential);

  if (command === "complete-intermediate") {
    const name = required(values, "name");
    const certificate = certificateInputToDer(
      required(values, "intermediate-certificate"),
    );
    const trustAnchor = certificateInputToDer(
      required(values, "trust-anchor-certificate"),
    ).toString("base64");
    const result = await completeIntermediate(
      certificateClient,
      keyClient,
      database,
      name,
      certificate,
      trustAnchor,
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (command === "create-leaf") {
    const issuer = required(values, "issuer-key-name");
    const name = required(values, "name");
    const result = await createLeafKey(
      database,
      keyClient,
      cryptographyClient,
      issuer,
      name,
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  throw new Error(`Unknown command ${command}`);
};

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
