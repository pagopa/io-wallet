# io-wallet-key-cli

Internal developer CLI for provisioning wallet signing keys. It uses `DefaultAzureCredential`, so engineers should authenticate with Azure CLI or another supported Entra credential before running it. The caller needs permission to manage the relevant Key Vault keys/certificates and write to the Cosmos DB database.

Run all `pnpm key-provisioning` commands below from this package's directory (`cd packages/io-wallet-key-cli`): the CLI loads `.env` relative to the current working directory, so it must match where `.env` is located.

Before running any command, copy `.env.example` to `.env` and fill in the values.

## Intermediate key

Create the pending Key Vault certificate and CSR with Azure CLI:

```bash
az keyvault certificate create \
  --vault-name <key-vault-name> \
  --name <certificate-name> \
  --policy @ec-policy.json
```

Example `ec-policy.json` (EC P-256 key, no default extensions):

```json
{
  "issuerParameters": {
    "name": "Unknown"
  },
  "keyProperties": {
    "keyType": "EC",
    "curve": "P-256",
    "exportable": false,
    "reuseKey": false
  },
  "x509CertificateProperties": {
    "subject": "E=pagopaspa@pec.pagopa.it, CN=wallet.io.pagopa.it\/v2, O=PagoPA S.p.A., L=Roma, ST=Lazio, C=IT",
    "keyUsage": ["digitalSignature", "keyCertSign", "cRLSign"],
    "ekus": []
  }
}
```

Send the CSR to the Trust Anchor by email. After receiving the signed certificate, run `complete-intermediate`; it merges the certificate into Key Vault and registers the public key and certificate chain in Cosmos DB:

```bash
pnpm key-provisioning complete-intermediate \
  --name <certificate-name> \
  --intermediate-certificate '<base64-certificate-from-trust-anchor>' \
  --trust-anchor-certificate '<base64-or-pem-trust-anchor-root-certificate>'
```

Pass the certificate returned by the Trust Anchor as a Base64 string or PEM value in `--intermediate-certificate`; `--trust-anchor-certificate` is the Trust Anchor's root CA certificate.

## Leaf key

Create a non-exportable P-256 leaf key, sign its certificate with an existing intermediate key, and register it in Cosmos DB:

```bash
pnpm key-provisioning create-leaf \
  --issuer-key-name <intermediate-key-name> \
  --name <leaf-key-name>
```

The CLI stores the leaf key document in the Cosmos DB `keys` container.
