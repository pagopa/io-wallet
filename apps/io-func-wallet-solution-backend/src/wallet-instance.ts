import * as t from "io-ts";

import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { WalletInstanceRequest } from "./wallet-instance-request";
import { AttestationServiceConfiguration } from "./app/config";
import {
  MobileAttestationService,
  ValidatedAttestation,
} from "./infra/attestation-service";
import { User } from "./user";

type AttestationService = {
  attestationServiceConfiguration: AttestationServiceConfiguration;
};

export type WalletInstanceRepository = {
  get: (
    id: WalletInstance["id"],
    userId: WalletInstance["userId"]
  ) => TE.TaskEither<Error, WalletInstance>;
  insert: (walletInstance: WalletInstance) => TE.TaskEither<Error, void>;
};

export type WalletInstanceEnvironment = {
  walletInstanceRepository: WalletInstanceRepository;
};

export const WalletInstance = t.type({
  id: NonEmptyString,
  userId: User.props.id,
  hardwareKey: t.record(t.string, t.unknown),
  signCount: t.number,
  isRevoked: t.boolean,
});

export type WalletInstance = t.TypeOf<typeof WalletInstance>;

export const insertWalletInstance: (
  walletInstance: WalletInstance
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (walletInstance) =>
  ({ walletInstanceRepository }) =>
    walletInstanceRepository.insert(walletInstance);

export const getWalletInstance: (
  id: WalletInstance["id"],
  userId: WalletInstance["userId"]
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, WalletInstance> =
  (id, userId) =>
  ({ walletInstanceRepository }) =>
    walletInstanceRepository.get(id, userId);

export const validateAttestation: (
  walletInstanceRequest: WalletInstanceRequest
) => RTE.ReaderTaskEither<AttestationService, Error, ValidatedAttestation> =
  (walletInstanceRequest) =>
  ({ attestationServiceConfiguration }) =>
    pipe(
      new MobileAttestationService(attestationServiceConfiguration),
      (attestationService) =>
        attestationService.validateAttestation(
          walletInstanceRequest.keyAttestation,
          walletInstanceRequest.challenge,
          walletInstanceRequest.hardwareKeyTag
        )
    );
