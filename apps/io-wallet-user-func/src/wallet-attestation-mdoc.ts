import { Document, IssuerSignedDocument } from "@auth0/mdl";
import { cborEncode as encode } from "@auth0/mdl/lib/cbor";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import { JwkPrivateKey } from "io-wallet-common/jwk";

import { WalletAttestationData } from "./encoders/wallet-attestation";
import { WalletAttestationEnvironment } from "./wallet-attestation";

const docType = "org.iso.18013.5.1.IT.WalletAttestation";

const domesticNameSpace = "org.iso.18013.5.1.IT";

const cborEncode = (
  document: IssuerSignedDocument,
): E.Either<Error, Buffer<ArrayBufferLike>> =>
  E.tryCatch(
    () => {
      const docMap = document.prepare();
      return encode({
        docType: docMap.get("docType"),
        issuerSigned: docMap.get("issuerSigned"),
      });
    },
    (reason) => (reason instanceof Error ? reason : new Error(String(reason))),
  );

const createDocument: ({
  issuerPrivateKey,
  walletAttestationData,
}: {
  issuerPrivateKey: JwkPrivateKey;
  walletAttestationData: WalletAttestationData;
}) => TE.TaskEither<Error, IssuerSignedDocument> = ({
  issuerPrivateKey,
  walletAttestationData,
}) =>
  TE.tryCatch(
    () =>
      new Document(docType)
        .addIssuerNameSpace(domesticNameSpace, {
          aal: walletAttestationData.aal,
          sub: walletAttestationData.sub,
          wallet_link: walletAttestationData.walletLink,
          wallet_name: walletAttestationData.walletName,
        })
        .useDigestAlgorithm("SHA-256")
        .addValidityInfo({
          signed: new Date(),
          validUntil: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
        })
        .addDeviceKeyInfo({
          deviceKey: walletAttestationData.walletInstancePublicKey,
        })
        .sign({
          alg: "ES256",
          issuerCertificate: ``, // TODO
          issuerPrivateKey,
          kid: issuerPrivateKey.kid,
        }),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason))),
  );

const createCborEncodedMDoc =
  (
    walletAttestationData: WalletAttestationData,
  ): ((
    dep: WalletAttestationEnvironment,
  ) => TE.TaskEither<Error, Buffer<ArrayBufferLike>>) =>
  (dep) =>
    pipe(
      walletAttestationData.kid,
      dep.signer.getPrivateKeyByKid,
      O.match(
        () =>
          TE.left(
            new Error(
              "Failed to retrieve private key while generating mDoc wallet attestation",
            ),
          ),
        (issuerPrivateKey) =>
          pipe(
            { issuerPrivateKey, walletAttestationData },
            createDocument,
            TE.chain(flow(cborEncode, TE.fromEither)),
          ),
      ),
    );

export const createWalletAttestationAsMdoc: (
  walletAttestationData: WalletAttestationData,
) => RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> = flow(
  createCborEncodedMDoc,
  RTE.map((buf) => Buffer.from(buf).toString("base64")),
);
