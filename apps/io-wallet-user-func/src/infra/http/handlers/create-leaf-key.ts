import { CryptographyClient, KeyClient } from "@azure/keyvault-keys";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnConvert } from "@peculiar/asn1-schema";
import * as asn1X509 from "@peculiar/asn1-x509";
import * as x509 from "@peculiar/x509";
import { createHash, randomBytes } from "crypto";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { ECKeyWithoutKid } from "io-wallet-common/jwk";
import { calculateJwkThumbprint } from "jose";

import { toPublicEcJwk } from "@/infra/azure/key-vault/key";
import { pemCertificateToBase64 } from "@/infra/crypto/certificate";
import {
  createKey as createKeyOnDatabase,
  getKey,
  Key,
  KeyRepository,
} from "@/keys";
import { sendTelemetryExceptionWithBody } from "@/telemetry";

type CreateLeafKeyEnvironment = CryptographyClientEnvironment &
  CryptoProviderEnvironment &
  KeyVaultEnvironment & {
    keyRepository: KeyRepository;
  };

interface CryptographyClientEnvironment {
  createCryptographyClient: (
    keyName: string,
  ) => Pick<CryptographyClient, "sign">;
}

interface CryptoProviderEnvironment {
  cryptoProvider: Crypto;
}

interface KeyVaultEnvironment {
  keyClient: Pick<KeyClient, "createEcKey">;
}

const CreateLeafKeyRequestPayload = t.type({
  issuerKeyName: NonEmptyString,
  leafKeyName: NonEmptyString,
});

type CreateLeafKeyRequestPayload = t.TypeOf<typeof CreateLeafKeyRequestPayload>;

const requireCreateLeafKeyRequest = (req: H.HttpRequest) =>
  pipe(req.body, H.parse(CreateLeafKeyRequestPayload));

interface KeyVaultPublicKey {
  keyName: string;
  publicKey: ECKeyWithoutKid;
}

const createLeafKeyOnKeyVault =
  (
    leafKeyName: NonEmptyString,
  ): RTE.ReaderTaskEither<KeyVaultEnvironment, Error, KeyVaultPublicKey> =>
  ({ keyClient }) =>
    pipe(
      TE.tryCatch(
        () =>
          keyClient.createEcKey(leafKeyName, {
            curve: "P-256",
            exportable: false,
            keyOps: ["sign", "verify"],
          }),
        (reason) =>
          new Error(`Unable to create leaf key in Azure Key Vault: ${reason}`),
      ),
      TE.chainW((key) =>
        pipe(
          key,
          toPublicEcJwk,
          E.map((publicKey) => ({ keyName: key.name, publicKey })),
          TE.fromEither,
        ),
      ),
    );

const publicKeyToSubjectPublicKeyInfo =
  (
    publicKey: ECKeyWithoutKid,
  ): RTE.ReaderTaskEither<CryptoProviderEnvironment, Error, ArrayBuffer> =>
  ({ cryptoProvider }) =>
    TE.tryCatch(async () => {
      const cryptoKey = await cryptoProvider.subtle.importKey(
        "jwk",
        {
          crv: publicKey.crv,
          ext: true,
          key_ops: ["verify"],
          kty: publicKey.kty,
          x: publicKey.x,
          y: publicKey.y,
        },
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        true,
        ["verify"],
      );

      return cryptoProvider.subtle.exportKey("spki", cryptoKey);
    }, E.toError);

// Generates a positive serial number, but does not guarantee uniqueness across certificates.
const generateCertificateSerialNumber = () => {
  const serialNumber = randomBytes(16);
  const positiveSerialNumber =
    serialNumber[0] < 0x80
      ? serialNumber
      : Buffer.concat([Buffer.from([0]), serialNumber]);

  return positiveSerialNumber.buffer.slice(
    positiveSerialNumber.byteOffset,
    positiveSerialNumber.byteOffset + positiveSerialNumber.byteLength,
  );
};

const ecdsaWithSha256AlgorithmIdentifier = new asn1X509.AlgorithmIdentifier({
  algorithm: "1.2.840.10045.4.3.2",
});

const createTbsCertificate = ({
  extensions,
  subjectName,
  subjectPublicKeyInfo,
}: {
  extensions: x509.Extension[];
  subjectName: x509.Name;
  subjectPublicKeyInfo: ArrayBuffer;
}) =>
  pipe(
    subjectName,
    (name) => AsnConvert.parse(name.toArrayBuffer(), asn1X509.Name),
    (parsedSubjectName) =>
      new asn1X509.TBSCertificate({
        extensions: new asn1X509.Extensions(
          extensions.map((extension) =>
            AsnConvert.parse(extension.rawData, asn1X509.Extension),
          ),
        ),
        issuer: parsedSubjectName,
        serialNumber: generateCertificateSerialNumber(),
        signature: ecdsaWithSha256AlgorithmIdentifier,
        subject: parsedSubjectName,
        subjectPublicKeyInfo: AsnConvert.parse(
          subjectPublicKeyInfo,
          asn1X509.SubjectPublicKeyInfo,
        ),
        validity: new asn1X509.Validity({
          notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          notBefore: new Date(),
        }),
        version: asn1X509.Version.v3,
      }),
  );

const signTbsCertificate =
  ({
    issuerKeyName,
    tbsCertificate,
  }: {
    issuerKeyName: string;
    tbsCertificate: asn1X509.TBSCertificate;
  }): RTE.ReaderTaskEither<CryptographyClientEnvironment, Error, ArrayBuffer> =>
  ({ createCryptographyClient }) =>
    TE.tryCatch(
      async () => {
        const digest = createHash("sha256")
          .update(Buffer.from(AsnConvert.serialize(tbsCertificate)))
          .digest();
        const { result } = await createCryptographyClient(issuerKeyName).sign(
          "ES256",
          digest,
        );

        const signature = new Uint8Array(result.byteLength);

        signature.set(result);

        return signature.buffer;
      },
      (reason) => new Error(`Unable to sign leaf certificate: ${reason}`),
    );

const toPositiveInteger = (value: Uint8Array) => {
  const firstSignificantByte = value.findIndex((byte) => byte !== 0);
  const significantBytes =
    firstSignificantByte === -1
      ? new Uint8Array([0])
      : value.subarray(firstSignificantByte);
  const positiveInteger =
    significantBytes[0] > 0x7f
      ? new Uint8Array([0, ...significantBytes])
      : significantBytes;

  return new Uint8Array(positiveInteger).buffer;
};

const ecdsaSignatureToAsn1 = (signature: ArrayBuffer) => {
  const signatureBytes = new Uint8Array(signature);

  return AsnConvert.serialize(
    new ECDSASigValue({
      r: toPositiveInteger(signatureBytes.slice(0, 32)),
      s: toPositiveInteger(signatureBytes.slice(32, 64)),
    }),
  );
};

const createLeafCertificateFromSignedTbs = ({
  signature,
  tbsCertificate,
}: {
  signature: ArrayBuffer;
  tbsCertificate: asn1X509.TBSCertificate;
}): E.Either<Error, string> =>
  E.tryCatch(
    () => {
      const certificate = new x509.X509Certificate(
        AsnConvert.serialize(
          new asn1X509.Certificate({
            signatureAlgorithm: ecdsaWithSha256AlgorithmIdentifier,
            signatureValue: ecdsaSignatureToAsn1(signature),
            tbsCertificate,
          }),
        ),
      );

      return certificate.toString("pem");
    },
    (reason) => new Error(`Unable to create leaf certificate: ${reason}`),
  );

// Builds the leaf certificate X.509 extensions: Basic Constraints, Key Usage, Subject Alternative Name, Subject Key Identifier, and Authority Key Identifier.
const createCertificateExtensions =
  ({
    issuerCertificate,
    subjectName,
    subjectPublicKeyInfo,
  }: {
    issuerCertificate: x509.X509Certificate;
    subjectName: x509.Name;
    subjectPublicKeyInfo: ArrayBuffer;
  }): RTE.ReaderTaskEither<
    CryptoProviderEnvironment,
    Error,
    x509.Extension[]
  > =>
  ({ cryptoProvider }) =>
    TE.tryCatch(
      async () => [
        new x509.BasicConstraintsExtension(false),
        new x509.KeyUsagesExtension(
          x509.KeyUsageFlags.digitalSignature +
            x509.KeyUsageFlags.keyEncipherment,
        ),
        new x509.SubjectAlternativeNameExtension([
          {
            type: "dns",
            value: subjectName.getField("CN")[0],
          },
        ]),
        await x509.SubjectKeyIdentifierExtension.create(
          subjectPublicKeyInfo,
          false,
          cryptoProvider,
        ),
        await x509.AuthorityKeyIdentifierExtension.create(
          issuerCertificate.publicKey,
          false,
          cryptoProvider,
        ),
      ],
      E.toError,
    );

const parseBase64Certificate = (certificate: string) =>
  TE.tryCatch(
    () =>
      Promise.resolve(
        new x509.X509Certificate(Buffer.from(certificate, "base64")),
      ),
    (reason) => new Error(`Unable to parse certificate: ${reason}`),
  );

const createTbsCertificateForPublicKey = ({
  issuerCertificate,
  subjectPublicKey,
}: {
  issuerCertificate: x509.X509Certificate;
  subjectPublicKey: ECKeyWithoutKid;
}): RTE.ReaderTaskEither<
  CryptoProviderEnvironment,
  Error,
  asn1X509.TBSCertificate
> =>
  pipe(
    subjectPublicKey,
    publicKeyToSubjectPublicKeyInfo,
    RTE.chainW((subjectPublicKeyInfo) =>
      pipe(
        createCertificateExtensions({
          issuerCertificate,
          subjectName: issuerCertificate.subjectName,
          subjectPublicKeyInfo,
        }),
        RTE.map((extensions) =>
          createTbsCertificate({
            extensions,
            subjectName: issuerCertificate.subjectName,
            subjectPublicKeyInfo,
          }),
        ),
      ),
    ),
  );

const createSignedCertificatePem = ({
  issuerKeyName,
  tbsCertificate,
}: {
  issuerKeyName: string;
  tbsCertificate: asn1X509.TBSCertificate;
}): RTE.ReaderTaskEither<CryptographyClientEnvironment, Error, string> =>
  pipe(
    signTbsCertificate({
      issuerKeyName,
      tbsCertificate,
    }),
    RTE.chainW((signature) =>
      pipe(
        createLeafCertificateFromSignedTbs({
          signature,
          tbsCertificate,
        }),
        RTE.fromEither,
      ),
    ),
  );

const createCertificate = ({
  issuerCertificate,
  issuerKeyName,
  subjectPublicKey,
}: {
  issuerCertificate: string;
  issuerKeyName: string;
  subjectPublicKey: ECKeyWithoutKid;
}): RTE.ReaderTaskEither<
  CryptographyClientEnvironment & CryptoProviderEnvironment,
  Error,
  string
> =>
  pipe(
    issuerCertificate,
    parseBase64Certificate,
    RTE.fromTaskEither,
    RTE.chainW((issuerCertificate) =>
      createTbsCertificateForPublicKey({
        issuerCertificate,
        subjectPublicKey,
      }),
    ),
    RTE.chainW((tbsCertificate) =>
      createSignedCertificatePem({
        issuerKeyName,
        tbsCertificate,
      }),
    ),
  );

const createLeafKeyWithCertificate =
  ({
    issuerKeyName,
    leafKeyName,
  }: CreateLeafKeyRequestPayload): RTE.ReaderTaskEither<
    CreateLeafKeyEnvironment,
    Error,
    Key
  > =>
  (environment) =>
    pipe(
      sequenceS(TE.ApplyPar)({
        entityCaKey: pipe(
          environment,
          getKey(issuerKeyName),
          TE.map(({ certificateChain, keyName }) => ({
            certificate: certificateChain[0],
            keyName,
          })),
        ),
        leafPublicKey: createLeafKeyOnKeyVault(leafKeyName)(environment),
      }),
      TE.chainW(({ entityCaKey, leafPublicKey }) =>
        pipe(
          environment,
          createCertificate({
            issuerCertificate: entityCaKey.certificate,
            issuerKeyName: entityCaKey.keyName,
            subjectPublicKey: leafPublicKey.publicKey,
          }),
          TE.chainW((leafCertificatePem) =>
            pipe(
              TE.tryCatch(
                () => calculateJwkThumbprint(leafPublicKey.publicKey, "sha256"),
                E.toError,
              ),
              TE.map((kid) => ({
                certificateChain: [
                  pemCertificateToBase64(leafCertificatePem),
                  entityCaKey.certificate,
                ],
                keyName: leafPublicKey.keyName,
                publicKey: { ...leafPublicKey.publicKey, kid },
              })),
            ),
          ),
        ),
      ),
      TE.chainFirstW((key) => pipe(environment, createKeyOnDatabase(key))),
    );

export const CreateLeafKeyHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireCreateLeafKeyRequest,
    RTE.fromEither,
    RTE.chainW(createLeafKeyWithCertificate),
    RTE.map(({ certificateChain, keyName, publicKey }) => ({
      certificate_chain: certificateChain,
      id: keyName,
      public_key: publicKey,
    })),
    RTE.map(H.successJson),
    RTE.orElseFirstW(
      flow(
        sendTelemetryExceptionWithBody({
          body: req.body,
          functionName: "createLeafKey",
        }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
