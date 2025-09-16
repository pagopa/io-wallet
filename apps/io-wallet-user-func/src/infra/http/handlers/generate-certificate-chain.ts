import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { Crypto } from "@peculiar/webcrypto";
import { X509Certificate, X509CertificateGenerator } from "@peculiar/x509";
import { sequenceS } from "fp-ts/Apply";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RE from "fp-ts/ReaderEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { Jwk, JwkPrivateKey, JwkPublicKey } from "io-wallet-common/jwk";

import {
  CertificateRepository,
  getCertificateChainByKid,
  insertCertificateChain,
} from "@/certificates";
import { pemCertificateToBase64 } from "@/infra/crypto/certificate";

interface CertificateEnvironment {
  certificate: { crypto: Crypto; issuer: string; subject: string };
  certificateRepository: CertificateRepository;
  federationEntitySigningKeys: JwkPrivateKey[];
}

const JwkPublicKeyWithRequiredKid = t.intersection([
  JwkPublicKey,
  t.type({ kid: t.string }),
]);

const GenerateCertificatePayload = t.type({
  issuer_key_id: NonEmptyString,
  subject_key: JwkPublicKeyWithRequiredKid,
});

type JwkPublicKeyWithRequiredKid = t.TypeOf<typeof JwkPublicKeyWithRequiredKid>;

const getSigningKey: (
  issuerKeyId: string,
) => RE.ReaderEither<CertificateEnvironment, Error, JwkPrivateKey> =
  (issuerKeyId: string) =>
  ({ federationEntitySigningKeys }: CertificateEnvironment) =>
    pipe(
      federationEntitySigningKeys,
      RA.findFirst(({ kid }) => kid === issuerKeyId),
      E.fromOption(() => new Error(`Key with kid "${issuerKeyId}" not found`)),
    );

const jwkToCryptoKey: (
  jwk: Jwk,
) => RTE.ReaderTaskEither<CertificateEnvironment, Error, CryptoKey> =
  (jwk) =>
  ({ certificate: { crypto } }) =>
    TE.tryCatch(
      () =>
        crypto.subtle.importKey(
          "jwk",
          jwk,
          {
            name: "ECDSA",
            namedCurve: "P-256",
          },
          true,
          ["d" in jwk ? "sign" : "verify"], // "sign" if private; "verify" if public
        ),
      (reason) =>
        reason instanceof Error ? reason : new Error(String(reason)),
    );

const issueX509Certificate: (input: {
  publicKey: CryptoKey;
  signingKey: CryptoKey;
}) => RTE.ReaderTaskEither<CertificateEnvironment, Error, X509Certificate> =
  ({ publicKey, signingKey }) =>
  ({ certificate: { crypto, issuer, subject } }) =>
    TE.tryCatch(
      () =>
        X509CertificateGenerator.create(
          {
            issuer,
            // certificate is valid starting 1 minute before and expires in 1 year
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            notBefore: new Date(Date.now() - 60000),
            publicKey,
            signingKey,
            subject,
          },
          crypto,
        ),
      (reason) =>
        reason instanceof Error ? reason : new Error(String(reason)),
    );

const requireRequestBody = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(GenerateCertificatePayload),
    E.map(({ issuer_key_id, subject_key }) => ({
      issuerKeyId: issuer_key_id,
      subjectKey: subject_key,
    })),
  );

const createCertificate: (input: {
  issuerKeyId: string;
  subjectKey: JwkPublicKeyWithRequiredKid;
}) => RTE.ReaderTaskEither<CertificateEnvironment, Error, string> = ({
  issuerKeyId,
  subjectKey,
}: {
  issuerKeyId: string;
  subjectKey: JwkPublicKeyWithRequiredKid;
}) =>
  pipe(
    issuerKeyId,
    getSigningKey,
    RTE.fromReaderEither,
    RTE.chainW((signingKey) =>
      sequenceS(RTE.ApplyPar)({
        publicKey: jwkToCryptoKey(subjectKey),
        signingKey: jwkToCryptoKey(signingKey),
      }),
    ),
    RTE.chain(issueX509Certificate),
    RTE.map((cert) => pemCertificateToBase64(cert.toString("pem"))),
  );

const createCertificateChain: (input: {
  certificate: string;
  issuerKeyId: string;
  subjectKeyId: string;
}) => RTE.ReaderTaskEither<CertificateEnvironment, Error, string[]> = ({
  certificate,
  issuerKeyId,
  subjectKeyId,
}) =>
  pipe(
    issuerKeyId,
    getCertificateChainByKid,
    RTE.chainW(
      O.fold(
        () =>
          RTE.left(
            new Error(`Certificate chain for kid "${issuerKeyId}" not found`),
          ),
        (certs) => RTE.right(certs),
      ),
    ),
    // TODO [SIW-2719]: add certificate chain validation
    RTE.map((certs) => [certificate, ...certs]),
    RTE.chainFirstW((certificates) =>
      insertCertificateChain({
        certificateChain: certificates,
        kid: subjectKeyId,
      }),
    ),
  );

export const GenerateCertificateChainHandler = H.of(
  flow(
    requireRequestBody,
    RTE.fromEither,
    RTE.bind("certificate", createCertificate),
    RTE.chain(({ certificate, issuerKeyId, subjectKey }) =>
      createCertificateChain({
        certificate,
        issuerKeyId,
        subjectKeyId: subjectKey.kid,
      }),
    ),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "generateCertificateChain",
        }),
        RTE.fromReader,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
