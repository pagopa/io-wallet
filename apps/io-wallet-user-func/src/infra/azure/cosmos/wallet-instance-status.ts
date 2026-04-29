// import { Container, Database } from "@azure/cosmos";
// import * as TE from "fp-ts/TaskEither";
// import {
//   WalletInstance,
//   WalletInstanceRevoked,
// } from "io-wallet-common/wallet-instance";

// import { toCosmosError } from "@/infra/azure/cosmos/errors";
// import { WalletInstanceStatusRepository } from "@/wallet-instance-status";

// const getRevocationPatchOperations = (
//   walletInstance: WalletInstanceRevoked,
// ) => [
//   {
//     op: "set" as const,
//     path: "/isRevoked",
//     value: walletInstance.isRevoked,
//   },
//   {
//     op: "set" as const,
//     path: "/revokedAt",
//     value: walletInstance.revokedAt,
//   },
//   ...(walletInstance.revocationReason === undefined
//     ? []
//     : [
//         {
//           op: "set" as const,
//           path: "/revocationReason",
//           value: walletInstance.revocationReason,
//         },
//       ]),
// ];

// export class CosmosDbWalletInstanceStatusRepository implements WalletInstanceStatusRepository {
//   readonly #container: Container;

//   constructor(db: Database) {
//     this.#container = db.container("wallet-instances-status");
//   }

//   readonly revoke = (
//     walletInstance: WalletInstanceRevoked,
//   ): TE.TaskEither<Error, void> =>
//     TE.tryCatch(async () => {
//       await this.#container
//         .item(walletInstance.id, walletInstance.userId)
//         .patch(getRevocationPatchOperations(walletInstance));
//     }, toCosmosError("Error revoking wallet instance status document"));

//   readonly save = (
//     walletInstance: WalletInstance,
//   ): TE.TaskEither<Error, void> =>
//     TE.tryCatch(async () => {
//       await this.#container.items.upsert(walletInstance);
//     }, toCosmosError("Error saving wallet instance status document"));
// }
