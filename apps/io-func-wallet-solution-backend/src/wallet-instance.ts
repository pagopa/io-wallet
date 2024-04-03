import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import {
  WalletInstanceRequest,
  verifyWalletInstanceRequest,
} from "./wallet-instance-request";
import { AttestationServiceConfiguration } from "./app/config";
import { MobileAttestationService } from "./infra/attestation-service";

export const createWalletInstance =
  (
    walletInstanceRequest: WalletInstanceRequest
  ): RTE.ReaderTaskEither<AttestationServiceConfiguration, Error, string> =>
  (attestationServiceConfiguration) =>
    pipe(
      walletInstanceRequest,
      verifyWalletInstanceRequest,
      TE.fromEither,
      TE.chain((request) =>
        pipe(
          new MobileAttestationService(attestationServiceConfiguration),
          (attestationService) =>
            attestationService.validateAttestation(
              request.keyAttestation,
              request.challenge,
              request.hardwareKeyTag
            )
        )
      ),
      // TODO: [SIW-456] - Add device registration
      TE.map(() => "OK")
    );
