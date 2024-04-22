import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import { WalletInstanceRequest } from "./wallet-instance-request";
import { AttestationServiceConfiguration } from "./app/config";
import { MobileAttestationService } from "./infra/attestation-service";

type AttestationService = {
  attestationServiceConfiguration: AttestationServiceConfiguration;
};

export const createWalletInstance =
  (
    walletInstanceRequest: WalletInstanceRequest
  ): RTE.ReaderTaskEither<AttestationService, Error, void> =>
  ({ attestationServiceConfiguration }: AttestationService) =>
    pipe(
      new MobileAttestationService(attestationServiceConfiguration),
      (attestationService) =>
        attestationService.validateAttestation(
          walletInstanceRequest.keyAttestation,
          walletInstanceRequest.challenge,
          walletInstanceRequest.hardwareKeyTag
        ),
      // TODO: [SIW-456] - Add device registration
      TE.map(() => void 0)
    );
