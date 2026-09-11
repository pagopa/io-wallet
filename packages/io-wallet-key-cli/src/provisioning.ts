import type { TokenCredential } from "@azure/identity";

import { CosmosClient, Database } from "@azure/cosmos";
import { CertificateClient } from "@azure/keyvault-certificates";
import {
  CryptographyClient,
  KeyClient,
  KeyVaultKey,
} from "@azure/keyvault-keys";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnConvert } from "@peculiar/asn1-schema";
import * as asn1X509 from "@peculiar/asn1-x509";
import * as x509 from "@peculiar/x509";
import { createHash, randomBytes, webcrypto } from "crypto";
import { ECKeyWithoutKid } from "io-wallet-common/jwk";
import { calculateJwkThumbprint } from "jose";

interface KeyDocument {
  certificateChain: string[];
  id: string;
  publicKey: {
    crv: string;
    kid: string;
    kty: "EC";
    x: string;
    y: string;
  };
}

const certificateToBase64 = (certificate: Uint8Array) =>
  Buffer.from(certificate).toString("base64");

const persistKey = async (database: Database, document: KeyDocument) => {
  await database.container("keys").items.create(document);
};

const toPublicEcJwk = (key: KeyVaultKey) => {
  const material = key.key;
  if (
    material === undefined ||
    material.kty !== "EC" ||
    material.crv === undefined ||
    material.x === undefined ||
    material.y === undefined
  ) {
    throw new Error("Key Vault key is not an EC public key");
  }
  const publicKey = {
    crv: material.crv,
    kty: "EC" as const,
    x: Buffer.from(material.x).toString("base64url"),
    y: Buffer.from(material.y).toString("base64url"),
  };
  const decoded = ECKeyWithoutKid.decode(publicKey);
  if (decoded._tag === "Left") {
    throw new Error("Key Vault key is not an EC public key");
  }
  return decoded.right;
};

const publicKeyWithKid = async (keyClient: KeyClient, keyName: string) => {
  const key = await keyClient.getKey(keyName);
  const publicKey = toPublicEcJwk(key);
  const kid = await calculateJwkThumbprint(publicKey, "sha256");
  return { ...publicKey, kid };
};

const registerIntermediateKey = async (
  certificateClient: CertificateClient,
  keyClient: KeyClient,
  database: Database,
  keyName: string,
  trustAnchorCertificate: string,
): Promise<KeyDocument> => {
  const [certificate, publicKey] = await Promise.all([
    certificateClient.getCertificate(keyName),
    publicKeyWithKid(keyClient, keyName),
  ]);
  if (certificate.cer === undefined) {
    throw new Error(
      `Key Vault certificate ${keyName} has no certificate material`,
    );
  }
  const document = {
    certificateChain: [
      certificateToBase64(certificate.cer),
      trustAnchorCertificate,
    ],
    id: keyName,
    publicKey,
  };
  await persistKey(database, document);
  return document;
};

const positiveSerialNumber = () => {
  const serialNumber = randomBytes(16);
  const buffer =
    serialNumber[0] < 0x80
      ? serialNumber
      : Buffer.concat([Buffer.from([0]), serialNumber]);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
};

const signatureAlgorithm = new asn1X509.AlgorithmIdentifier({
  algorithm: "1.2.840.10045.4.3.2",
});

const toPositiveInteger = (value: Uint8Array) => {
  const first = value.findIndex((byte) => byte !== 0);
  const significant =
    first === -1 ? new Uint8Array([0]) : value.subarray(first);
  return new Uint8Array(
    significant[0] > 0x7f ? [0, ...significant] : significant,
  ).buffer;
};

const ecdsaSignatureToAsn1 = (signature: Uint8Array) => {
  const bytes = new Uint8Array(signature);
  return AsnConvert.serialize(
    new ECDSASigValue({
      r: toPositiveInteger(bytes.slice(0, 32)),
      s: toPositiveInteger(bytes.slice(32, 64)),
    }),
  );
};

const createLeafCertificate = async (
  cryptographyClient: (keyName: string) => CryptographyClient,
  issuerKeyName: string,
  issuerCertificate: string,
  subjectPublicKey: { crv: string; kty: "EC"; x: string; y: string },
) => {
  const issuer = new x509.X509Certificate(
    Buffer.from(issuerCertificate, "base64"),
  );
  const subjectKey = await webcrypto.subtle.importKey(
    "jwk",
    { ...subjectPublicKey, ext: true, key_ops: ["verify"] },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
  const subjectSpki = await webcrypto.subtle.exportKey("spki", subjectKey);
  const subjectName = issuer.subjectName;
  const subjectDns = subjectName.getField("CN")[0];
  const subjectUri = `https://${subjectDns}`;
  const nameConstraints = new asn1X509.NameConstraints({
    permittedSubtrees: new asn1X509.GeneralSubtrees([
      new asn1X509.GeneralSubtree({
        base: new asn1X509.GeneralName({ dNSName: subjectDns }),
      }),
      new asn1X509.GeneralSubtree({
        base: new asn1X509.GeneralName({
          uniformResourceIdentifier: subjectDns,
        }),
      }),
    ]),
  });
  const extensions = [
    new x509.BasicConstraintsExtension(false, undefined, true),
    new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true),
    new x509.SubjectAlternativeNameExtension([
      { type: "dns" as const, value: subjectDns },
      { type: "url" as const, value: subjectUri },
    ]),
    await x509.SubjectKeyIdentifierExtension.create(subjectSpki, false),
    await x509.AuthorityKeyIdentifierExtension.create(issuer.publicKey, false),
    new x509.Extension(
      asn1X509.id_ce_nameConstraints,
      true,
      AsnConvert.serialize(nameConstraints),
    ),
  ];
  const parsedName = AsnConvert.parse(
    subjectName.toArrayBuffer(),
    asn1X509.Name,
  );
  const tbs = new asn1X509.TBSCertificate({
    extensions: new asn1X509.Extensions(
      extensions.map((extension) =>
        AsnConvert.parse(extension.rawData, asn1X509.Extension),
      ),
    ),
    issuer: parsedName,
    serialNumber: positiveSerialNumber(),
    signature: signatureAlgorithm,
    subject: parsedName,
    subjectPublicKeyInfo: AsnConvert.parse(
      subjectSpki,
      asn1X509.SubjectPublicKeyInfo,
    ),
    validity: new asn1X509.Validity({
      notAfter: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
      notBefore: new Date(),
    }),
    version: asn1X509.Version.v3,
  });
  const digest = createHash("sha256")
    .update(Buffer.from(AsnConvert.serialize(tbs)))
    .digest();
  const signed = await cryptographyClient(issuerKeyName).sign("ES256", digest);
  if (signed.result.length !== 64) {
    throw new Error(
      `Unexpected ES256 signature length from Key Vault: ${signed.result.length} bytes (expected 64). The sign operation may have failed authentication.`,
    );
  }
  return new x509.X509Certificate(
    AsnConvert.serialize(
      new asn1X509.Certificate({
        signatureAlgorithm,
        signatureValue: ecdsaSignatureToAsn1(new Uint8Array(signed.result)),
        tbsCertificate: tbs,
      }),
    ),
  ).toString("pem");
};

export const createLeafKey = async (
  database: Database,
  keyClient: KeyClient,
  cryptographyClient: (keyName: string) => CryptographyClient,
  issuerKeyName: string,
  leafKeyName: string,
): Promise<KeyDocument> => {
  const issuer = await database
    .container("keys")
    .item(issuerKeyName, issuerKeyName)
    .read<KeyDocument>();
  if (issuer.resource === undefined) {
    throw new Error(`Key ${issuerKeyName} not found`);
  }
  const leaf = await keyClient.createEcKey(leafKeyName, {
    curve: "P-256",
    exportable: false,
    keyOps: ["sign", "verify"],
  });
  const publicKey = toPublicEcJwk(leaf);
  const certificate = await createLeafCertificate(
    cryptographyClient,
    issuerKeyName,
    issuer.resource.certificateChain[0],
    publicKey,
  );
  const kid = await calculateJwkThumbprint(publicKey, "sha256");
  const document = {
    certificateChain: [
      certificateToBase64(
        Buffer.from(
          certificate.replace(
            /-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g,
            "",
          ),
          "base64",
        ),
      ),
      ...issuer.resource.certificateChain,
    ],
    id: leaf.name,
    publicKey: { ...publicKey, kid },
  };
  await persistKey(database, document);
  return document;
};

export const completeIntermediate = async (
  certificateClient: CertificateClient,
  keyClient: KeyClient,
  database: Database,
  keyName: string,
  certificate: Uint8Array,
  trustAnchorCertificate: string,
) => {
  await certificateClient.mergeCertificate(keyName, [certificate]);
  return registerIntermediateKey(
    certificateClient,
    keyClient,
    database,
    keyName,
    trustAnchorCertificate,
  );
};

export const createCertificateClient = (
  vaultUrl: string,
  credential: ConstructorParameters<typeof CertificateClient>[1],
) => new CertificateClient(vaultUrl, credential);

export const createKeyClient = (
  vaultUrl: string,
  credential: ConstructorParameters<typeof KeyClient>[1],
) => new KeyClient(vaultUrl, credential);

export const createCryptographyClient =
  (vaultUrl: string, credential: TokenCredential) => (keyName: string) =>
    new CryptographyClient(
      `${vaultUrl.replace(/\/$/, "")}/keys/${keyName}`,
      credential,
    );

export const getDatabase = (
  cosmosEndpoint: string,
  databaseName: string,
  credential: TokenCredential,
) =>
  new CosmosClient({
    aadCredentials: credential,
    endpoint: cosmosEndpoint,
  }).database(databaseName);
