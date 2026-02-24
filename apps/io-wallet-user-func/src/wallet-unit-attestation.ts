// import { pipe } from "fp-ts/function";
// import * as RTE from "fp-ts/lib/ReaderTaskEither";
// import * as E from "io-ts/lib/Encoder";
// import { JwkPublicKey } from "io-wallet-common/jwk";

// import { removeTrailingSlash } from "./url";
// import { CertificateRepository } from "./certificates";
// import { FederationEntity } from "./entity-configuration";
// import { Signer } from "./signer";
// import { ValidUrl } from "@pagopa/ts-commons/lib/url";

// interface WalletUnitAttestationData {
//   iss: string;
//   keyStorage: string[];
//   kid: string;
//   userAuthentication: string[];
//   walletInstancePublicKey: JwkPublicKey;
//   x5c: string[];
// }

// interface WalletUnitAttestationJwtModel {
//   attested_keys: JwkPublicKey[];
//   iss: string;
//   key_storage: string[];
//   kid: string;
//   status: {
//     status_list: {
//       idx: number;
//       uri: string;
//     };
//   };
//   user_authentication: string[];
//   x5c: string[];
// }

// const WalletUnitAttestationToJwtModel: E.Encoder<
//   WalletUnitAttestationJwtModel,
//   WalletUnitAttestationData
// > = {
//   encode: ({
//     iss,
//     keyStorage,
//     kid,
//     userAuthentication,
//     walletInstancePublicKey,
//     x5c,
//   }) => ({
//     attested_keys: [walletInstancePublicKey],
//     iss: removeTrailingSlash(iss),
//     key_storage: keyStorage,
//     kid,
//     status: {
//       status_list: {
//         idx: 0,
//         uri: "https://walletprovider.it/status-lists/0",
//       },
//     },
//     user_authentication: userAuthentication,
//     x5c,
//   }),
// };

// export interface WalletUnitAttestationEnvironment {
//   certificateRepository: CertificateRepository;
//   federationEntity: FederationEntity;
//   signer: Signer;
//   walletAttestationConfig: { trustAnchorUrl: ValidUrl };
// }

// export const createWalletUnitAttestation =
//   (
//     walletAttestationData: WalletUnitAttestationData,
//   ): RTE.ReaderTaskEither<WalletUnitAttestationEnvironment, Error, string> =>
//   (dep) =>
//     pipe(
//       walletAttestationData,
//       WalletUnitAttestationToJwtModel.encode,
//       ({ kid, x5c, ...payload }) =>
//         dep.signer.createJwtAndSign(
//           {
//             typ: "key-attestation+jwt",
//             x5c,
//           },
//           kid,
//           "ES256",
//           "1h",
//         )(payload),
//     );
