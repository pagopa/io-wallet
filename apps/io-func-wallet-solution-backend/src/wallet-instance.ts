import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import { JWK } from "jose";
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
  insert: (walletInstance: WalletInstance) => TE.TaskEither<Error, void>;
};

type WalletInstanceEnvironment = {
  walletInstanceRepository: WalletInstanceRepository;
};

type Dependencies = {
  attestationServiceConfiguration: AttestationServiceConfiguration;
  walletInstanceRepository: WalletInstanceRepository;
};

export type WalletInstance = {
  id: NonEmptyString;
  userId: User["id"];
  hardwareKey: JWK;
};

const insertWalletInstance: (
  walletInstance: WalletInstance
) => RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =
  (walletInstance) =>
  ({ walletInstanceRepository }) =>
    walletInstanceRepository.insert(walletInstance);

const validateAttestation: (
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

export const createWalletInstance: (request: {
  walletInstanceRequest: WalletInstanceRequest;
  user: User;
}) => RTE.ReaderTaskEither<Dependencies, Error, void> = ({
  walletInstanceRequest,
  user,
}) =>
  pipe(
    walletInstanceRequest,
    validateAttestation,
    RTE.chainW(({ hardwareKey }) =>
      insertWalletInstance({
        id: walletInstanceRequest.hardwareKeyTag,
        userId: user.id,
        hardwareKey,
      })
    )
  );
