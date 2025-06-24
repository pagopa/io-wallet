import IssuerAuth from "@auth0/mdl/lib/mdoc/model/IssuerAuth";
import * as cbor from "cbor2";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import { sequenceS, sequenceT } from "fp-ts/lib/Apply";
import { ECKey, RSAKey } from "io-wallet-common/jwk";
import * as jose from "jose";

import { WalletAttestationData } from "./encoders/wallet-attestation";
import { createHash } from "./infra/crypto/hashing";
import { generateRandomUint8Array } from "./infra/crypto/random";
import {
  WalletAttestationEnvironment,
  getWalletAttestationData,
} from "./wallet-attestation";
import { WalletAttestationRequestV2 } from "./wallet-attestation-request";

const docType = "org.iso.18013.5.1.it.WalletAttestation";

const domesticNameSpace = "org.iso.18013.5.1.it";

type NameSpacesMapping<T> = {
  [K in typeof domesticNameSpace]: T[];
};

interface DecodedNameSpace {
  digestID: number;
  elementIdentifier: string;
  elementValue: unknown;
  random: Uint8Array<ArrayBuffer>;
}

type DecodedNameSpaces = NameSpacesMapping<DecodedNameSpace>;

type NameSpaces = NameSpacesMapping<cbor.Tag>;

// interface DeviceKeyBase {
//   1: number; // kty
// }

// interface EC2DeviceKey extends DeviceKeyBase {
//   "-1": number; // crv
//   "-2": Uint8Array; // x
//   "-3": Uint8Array; // y
//   1: 2; // 2 = EC
// }

// interface RSADeviceKey extends DeviceKeyBase {
//   "-1": Uint8Array; // n
//   "-2": Uint8Array; // e
//   1: 3; // 3 = RSA
//   3: number; // alg
// }

// type DeviceKey1 = EC2DeviceKey | RSADeviceKey;

type DeviceKey = Map<number, Uint8Array | number>;

interface Mdoc {
  docType: string;
  issuerSigned: {
    issuerAuth: IssuerAuth;
    nameSpaces: Record<string, cbor.Tag[]>;
  };
}

const createDecodedNameSpaces: (
  walletAttestationData: Pick<
    WalletAttestationData,
    "aal" | "sub" | "walletLink" | "walletName"
  >,
) => E.Either<Error, DecodedNameSpaces> = ({
  aal,
  sub,
  walletLink,
  walletName,
}) =>
  pipe(
    sequenceT(E.Apply)(
      generateRandomUint8Array(),
      generateRandomUint8Array(),
      generateRandomUint8Array(),
      generateRandomUint8Array(),
    ),
    E.map(([random1, random2, random3, random4]) => ({
      [domesticNameSpace]: [
        {
          digestID: 0,
          elementIdentifier: "wallet_name",
          elementValue: walletName,
          random: random1,
        },
        {
          digestID: 1,
          elementIdentifier: "wallet_link",
          elementValue: walletLink,
          random: random2,
        },
        {
          digestID: 2,
          elementIdentifier: "sub",
          elementValue: sub,
          random: random3,
        },
        {
          digestID: 3,
          elementIdentifier: "aal",
          elementValue: aal,
          random: random4,
        },
      ],
    })),
  );

const createNameSpaces = (
  decodedNameSpaces: DecodedNameSpaces,
): E.Either<Error, NameSpaces> =>
  pipe(
    decodedNameSpaces[domesticNameSpace],
    A.traverse(E.Applicative)((nameSpace) =>
      E.tryCatch(
        () => new cbor.Tag(24, cbor.encode(nameSpace)),
        (e) => (e instanceof Error ? e : new Error(String(e))),
      ),
    ),
    E.map((tags) => ({
      [domesticNameSpace]: tags,
    })),
  );

const crvMap: Record<string, number> = {
  "P-256": 1,
  "P-384": 2,
  "P-521": 3,
};

const algMap: Record<string, number> = {
  PS256: -37,
  PS384: -38,
  PS512: -39,
  RS256: -257,
  RS384: -258,
  RS512: -259,
};

// da buffer a Uint8Array. sia buf: Buffer
// const xBytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
// const ecKeyToCose1 = (publicKey: ECKey) => ({
//   "-1": crvMap[publicKey.crv] ?? 1,
//   "-2": new Uint8Array(Buffer.from(publicKey.x, "base64url")),
//   "-3": new Uint8Array(Buffer.from(publicKey.y, "base64url")),
//   1: 2 as const,
//   // 3: -7,
// });

const ecKeyToCose = (publicKey: ECKey): DeviceKey =>
  new Map<number, Uint8Array | number>([
    [-1, crvMap[publicKey.crv] ?? 1],
    [-2, new Uint8Array(Buffer.from(publicKey.x, "base64url"))],
    [-3, new Uint8Array(Buffer.from(publicKey.y, "base64url"))],
    [1, 2],
  ]);

// const rsaKeyToCose = (publicKey: RSAKey) => ({
//   "-1": new Uint8Array(Buffer.from(publicKey.n, "base64url")),
//   "-2": new Uint8Array(Buffer.from(publicKey.e, "base64url")),
//   1: 3 as const,
//   3: publicKey.alg ? (algMap[publicKey.alg] ?? -257) : -257,
// });
const rsaKeyToCose = (publicKey: RSAKey): DeviceKey =>
  new Map<number, Uint8Array | number>([
    [-1, new Uint8Array(Buffer.from(publicKey.n, "base64url"))],
    [-2, new Uint8Array(Buffer.from(publicKey.e, "base64url"))],
    [1, 3],
    [3, publicKey.alg ? (algMap[publicKey.alg] ?? -257) : -257],
  ]);

const getDeviceKey: (
  publicKey: WalletAttestationData["walletInstancePublicKey"],
) => DeviceKey = (publicKey) =>
  publicKey.kty === "EC" ? ecKeyToCose(publicKey) : rsaKeyToCose(publicKey);

const createNameSpaceHash = (
  ns: DecodedNameSpace,
): E.Either<Error, Uint8Array> =>
  E.tryCatch(
    () =>
      pipe(
        ns,
        cbor.encode,
        (encoded) => new cbor.Tag(24, encoded),
        cbor.encode,
        createHash,
      ),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );

const computeValueDigests = (
  decodedNameSpaces: DecodedNameSpaces,
): E.Either<
  Error,
  { [K in typeof domesticNameSpace]: Map<number, Uint8Array<ArrayBufferLike>> }
> =>
  pipe(
    decodedNameSpaces[domesticNameSpace],
    A.traverse(E.Applicative)(createNameSpaceHash),
    E.map((hashes) => new Map(hashes.map((buf, i) => [i, buf]))),
    E.map((map) => ({
      [domesticNameSpace]: map,
    })),
  );
// pipe(
//   decodedNameSpaces[domesticNameSpace],
//   A.traverse(E.Applicative)(createNameSpaceHash),
//   E.map((hashes) => ({
//     [domesticNameSpace]: Object.fromEntries(hashes.map((buf, i) => [i, buf])),
//   })),
// );

const getTimestamp = (t?: number) => {
  if (t) {
    return new Date(t).toISOString().split(".")[0] + "Z";
  }
  return new Date().toISOString().split(".")[0] + "Z";
};

const createIssuerAuthPayload = ({
  decodedNameSpaces,
  walletInstancePublicKey,
}: {
  decodedNameSpaces: DecodedNameSpaces;
  walletInstancePublicKey: WalletAttestationData["walletInstancePublicKey"];
}): E.Either<Error, Uint8Array<ArrayBufferLike>> =>
  pipe(
    decodedNameSpaces,
    computeValueDigests,
    E.map((valueDigests) => ({
      deviceKeyInfo: {
        deviceKey: getDeviceKey(walletInstancePublicKey),
      },
      digestAlgorithm: "SHA-256",
      docType,
      validityInfo: {
        signed: getTimestamp(),
        validFrom: getTimestamp(),
        validUntil: getTimestamp(Date.now() + 1000 * 60 * 60), // 1 hour
        // new Date(Date.now() + 1000 * 60 * 60), // 1 hour
      },
      valueDigests,
      version: domesticNameSpace,
    })),
    E.chain(cborEncode),
    E.chain((encodedPayload) =>
      E.tryCatch(
        () => new cbor.Tag(24, encodedPayload),
        () =>
          new Error(
            "Failed to create CBOR tag while generating mDoc wallet attestation",
          ),
      ),
    ),
    E.chain(cborEncode),
  );

const signCose: (input: {
  kid: string;
  payload: Uint8Array<ArrayBufferLike>;
}) => RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, IssuerAuth> =
  ({ kid, payload }) =>
  (dep) =>
    pipe(
      kid,
      dep.signer.getPrivateKeyByKid,
      O.match(
        () =>
          TE.left(
            new Error(
              "Failed to retrieve private key while generating mDoc wallet attestation",
            ),
          ),
        (privateKey) =>
          TE.tryCatch(
            async () => {
              const issuerPrivateKey = await jose.importJWK(privateKey);
              const issuerAuth = await IssuerAuth.sign(
                { alg: "ES256" },
                { kid },
                payload,
                issuerPrivateKey,
              );
              return issuerAuth;
            },
            (reason) =>
              reason instanceof Error ? reason : new Error(String(reason)),
          ),
      ),
    );

const createIssuerAuth: (input: {
  decodedNameSpaces: DecodedNameSpaces;
  walletAttestationData: WalletAttestationData;
}) => RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, IssuerAuth> = ({
  decodedNameSpaces,
  walletAttestationData: { kid, walletInstancePublicKey },
}) =>
  pipe(
    {
      decodedNameSpaces,
      walletInstancePublicKey,
    },
    createIssuerAuthPayload,
    RTE.fromEither,
    RTE.chainW((encodedTaggedPayload) =>
      signCose({ kid, payload: encodedTaggedPayload }),
    ),
    RTE.map(
      (payload) =>
        new IssuerAuth(
          new Uint8Array(cbor.encode(payload.protectedHeaders)),
          payload.unprotectedHeaders,
          payload.payload,
          new Uint8Array(payload.signature),
        ),
    ),
  );

const createMdoc: (
  walletAttestationData: WalletAttestationData,
) => RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, Mdoc> = (
  walletAttestationData,
) =>
  pipe(
    walletAttestationData,
    createDecodedNameSpaces,
    RTE.fromEither,
    RTE.chain((decodedNameSpaces) =>
      sequenceS(RTE.ApplyPar)({
        issuerAuth: pipe(
          {
            decodedNameSpaces,
            walletAttestationData,
          },
          createIssuerAuth,
        ),
        nameSpaces: pipe(decodedNameSpaces, createNameSpaces, RTE.fromEither),
      }),
    ),
    RTE.map((issuerSigned) => ({
      docType,
      issuerSigned,
    })),
  );

const cborEncode = (
  val: unknown,
): E.Either<Error, Uint8Array<ArrayBufferLike>> =>
  E.tryCatch(
    () => cbor.encode(val),
    (reason) => (reason instanceof Error ? reason : new Error(String(reason))),
  );

const createDocMap = (document: Mdoc) =>
  new Map<
    string,
    | {
        issuerAuth: (Map<number, unknown> | Uint8Array | undefined)[];
        nameSpaces: Record<string, cbor.Tag[]>;
      }
    | string
  >([
    ["docType", document.docType],
    [
      "issuerSigned",
      {
        issuerAuth: document.issuerSigned.issuerAuth.getContentForEncoding(),
        nameSpaces: document.issuerSigned.nameSpaces,
      },
    ],
  ]);

// this function returns the credential encoded as binary data in CBOR format
const createCborEncodedMDoc: (
  walletAttestationData: WalletAttestationData,
) => RTE.ReaderTaskEither<
  WalletAttestationEnvironment,
  Error,
  Uint8Array<ArrayBufferLike>
> = flow(
  createMdoc,
  RTE.map(createDocMap),
  RTE.chainW((docMap) =>
    pipe(
      cborEncode({
        docType: docMap.get("docType"),
        issuerSigned: docMap.get("issuerSigned"),
      }),
      RTE.fromEither,
    ),
  ),
);

export const createWalletAttestationAsMdoc: (
  walletAttestationRequest: WalletAttestationRequestV2,
) => RTE.ReaderTaskEither<WalletAttestationEnvironment, Error, string> = flow(
  getWalletAttestationData,
  RTE.chainW(createCborEncodedMDoc),
  RTE.map((uint8) => Buffer.from(uint8).toString("base64")),
);
