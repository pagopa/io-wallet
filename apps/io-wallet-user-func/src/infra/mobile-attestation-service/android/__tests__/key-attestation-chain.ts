import {
  AttestationApplicationId,
  AttestationPackageInfo,
  AuthorizationList,
  IntegerSet,
  KeyDescription,
  RootOfTrust,
} from "@peculiar/asn1-android";
import { AsnConvert, OctetString } from "@peculiar/asn1-schema";
import * as x509 from "@peculiar/x509";
import * as crypto from "crypto";

import { base64ToPem } from "..";

x509.cryptoProvider.set(crypto.webcrypto as unknown as Crypto);

const KEY_DESCRIPTION_OID = "1.3.6.1.4.1.11129.2.1.17";
const EC_ALGORITHM = { hash: "SHA-256", name: "ECDSA", namedCurve: "P-256" };

export const PACKAGE_NAME = "it.pagopa.io.app";
export const SIGNATURE_DIGEST = "ab".repeat(32);
// Pixel 10a GrapheneOS verified boot key
export const GRAPHENEOS_BOOT_KEY =
  "d8f879d10419eddc9fcda6280718be763f6bf12299e1f72df3ea8ad8a8eb7f80";

/**
 * Values of a synthetic key attestation, defaulting to a device running GrapheneOS.
 */
export interface TestAttestationParams {
  challenge: string;
  deviceLocked: boolean;
  packageName: string;
  purposes: number[];
  securityLevel: number;
  signatureDigests: string[];
  verifiedBootKey: string;
  verifiedBootState: number;
}

export const grapheneOsParams = (
  overrides: Partial<TestAttestationParams> = {},
): TestAttestationParams => ({
  challenge: "challenge",
  deviceLocked: true,
  packageName: PACKAGE_NAME,
  purposes: [2],
  securityLevel: 2,
  signatureDigests: [SIGNATURE_DIGEST],
  verifiedBootKey: GRAPHENEOS_BOOT_KEY,
  verifiedBootState: 1,
  ...overrides,
});

const octetString = (value: Buffer | string) =>
  new OctetString(Buffer.isBuffer(value) ? value : Buffer.from(value, "utf-8"));

const encodeKeyDescription = (params: TestAttestationParams) => {
  const applicationId = new AttestationApplicationId({
    packageInfos: [
      new AttestationPackageInfo({
        packageName: octetString(params.packageName),
        version: 1,
      }),
    ],
    signatureDigests: params.signatureDigests.map((digest) =>
      octetString(Buffer.from(digest, "hex")),
    ),
  });
  return AsnConvert.serialize(
    new KeyDescription({
      attestationChallenge: octetString(params.challenge),
      attestationSecurityLevel: params.securityLevel,
      attestationVersion: 300,
      keymasterSecurityLevel: params.securityLevel,
      keymasterVersion: 300,
      softwareEnforced: new AuthorizationList({
        attestationApplicationId: octetString(
          Buffer.from(AsnConvert.serialize(applicationId)),
        ),
      }),
      teeEnforced: new AuthorizationList({
        algorithm: 3,
        origin: 0,
        osPatchLevel: 202610,
        osVersion: 160000,
        purpose: new IntegerSet(params.purposes),
        rootOfTrust: new RootOfTrust({
          deviceLocked: params.deviceLocked,
          verifiedBootHash: octetString(Buffer.alloc(32, 7)),
          verifiedBootKey: octetString(
            Buffer.from(params.verifiedBootKey, "hex"),
          ),
          verifiedBootState: params.verifiedBootState,
        }),
      }),
      uniqueId: octetString(""),
    }),
  );
};

interface Issuer {
  certificate: x509.X509Certificate;
  keys: CryptoKeyPair;
}

const generateKeys = async () =>
  (await crypto.webcrypto.subtle.generateKey(EC_ALGORITHM, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;

const createAttestedCertificate = (
  subject: string,
  issuer: Issuer,
  keys: CryptoKeyPair,
  params: TestAttestationParams,
  serialNumber: string,
) =>
  x509.X509CertificateGenerator.create({
    extensions: [
      new x509.Extension(
        KEY_DESCRIPTION_OID,
        false,
        encodeKeyDescription(params),
      ),
    ],
    issuer: issuer.certificate.subject,
    notAfter: new Date("2048-01-01T00:00:00Z"),
    notBefore: new Date("1970-01-01T00:00:00Z"),
    publicKey: keys.publicKey,
    serialNumber,
    signingAlgorithm: EC_ALGORITHM,
    signingKey: issuer.keys.privateKey,
    subject,
  });

/**
 * A test root CA, whose public key replaces the Google ones.
 */
export const createTestRoot = async () => {
  const keys = await generateKeys();
  const certificate = await x509.X509CertificateGenerator.createSelfSigned({
    extensions: [new x509.BasicConstraintsExtension(true, undefined, true)],
    keys,
    name: "CN=Test Attestation Root",
    notAfter: new Date("2040-01-01T00:00:00Z"),
    notBefore: new Date("2020-01-01T00:00:00Z"),
    serialNumber: "01",
    signingAlgorithm: EC_ALGORITHM,
  });
  return {
    certificate,
    keys,
    publicKeyPem: certificate.publicKey.toString("pem"),
  };
};

export type TestAttestKey = Issuer;
export type TestRoot = Awaited<ReturnType<typeof createTestRoot>>;

/**
 * Creates an app attest key issued by the test root.
 */
export const createAttestKey = async (
  root: TestRoot,
  params: TestAttestationParams,
): Promise<TestAttestKey> => {
  const keys = await generateKeys();
  const certificate = await createAttestedCertificate(
    "CN=Android Keystore Attest Key",
    root,
    keys,
    params,
    "02",
  );
  return { certificate, keys };
};

/**
 * Creates a key attestation chain encoded like the native module does.
 * By default the leaf is attested by a new attest key with the same parameters.
 */
export const createAttestation = async (
  root: TestRoot,
  params: TestAttestationParams,
  options: {
    attestKey?: null | TestAttestKey;
    attestKeyParams?: Partial<TestAttestationParams>;
  } = {},
) => {
  const attestKey =
    options.attestKey === null
      ? undefined
      : (options.attestKey ??
        (await createAttestKey(root, {
          ...params,
          purposes: [7],
          ...options.attestKeyParams,
        })));
  const keys = await generateKeys();
  const leaf = await createAttestedCertificate(
    "CN=Android Keystore Key",
    attestKey ?? root,
    keys,
    params,
    "0a",
  );
  const certificates = [
    leaf,
    ...(attestKey ? [attestKey.certificate] : []),
    root.certificate,
  ];
  const encoded = Buffer.from(
    certificates
      .map((c) => `${Buffer.from(c.rawData).toString("base64")}\n`)
      .join(","),
  ).toString("base64");
  return {
    attestKey,
    encoded,
    privateKey: crypto.KeyObject.from(keys.privateKey),
    x509Chain: certificates.map(
      (c) =>
        new crypto.X509Certificate(
          base64ToPem(`${Buffer.from(c.rawData).toString("base64")}\n`),
        ),
    ),
  };
};
