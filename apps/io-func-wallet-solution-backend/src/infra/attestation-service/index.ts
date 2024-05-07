import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { pipe, identity } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as E from "fp-ts/Either";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as J from "fp-ts/Json";
import { sequenceS } from "fp-ts/lib/Apply";

import {
  AttestationService,
  ValidatedAttestation,
  ValidateAssertionRequest,
} from "../../attestation-service";
import { AttestationServiceConfiguration } from "../../app/config";
import { validateiOSAssertion, validateiOSAttestation } from "./ios";
import {
  validateAndroidAssertion,
  validateAndroidAttestation,
} from "./android";
import { getWalletInstance } from "@/wallet-instance";

export class MobileAttestationService implements AttestationService {
  #configuration: AttestationServiceConfiguration;

  constructor(cnf: AttestationServiceConfiguration) {
    this.#configuration = cnf;
  }

  validateAttestation = (
    attestation: NonEmptyString,
    nonce: NonEmptyString,
    hardwareKeyTag: NonEmptyString
  ): TE.TaskEither<Error, ValidatedAttestation> =>
    pipe(
      E.tryCatch(
        () => Buffer.from(attestation, "base64"),
        () => new Error(`Invalid attestation: ${attestation}`)
      ),
      TE.fromEither,
      TE.chainW((data) =>
        pipe(
          [
            validateiOSAttestation(
              data,
              nonce,
              hardwareKeyTag,
              this.#configuration.iOsBundleIdentifier,
              this.#configuration.iOsTeamIdentifier,
              this.#configuration.appleRootCertificate,
              this.#configuration.allowDevelopmentEnvironment
            ),
            validateAndroidAttestation(
              data,
              nonce,
              hardwareKeyTag,
              this.#configuration.androidBundleIdentifier,
              this.#configuration.googlePublicKey,
              this.#configuration.androidCrlUrl
            ),
          ],
          RA.wilt(T.ApplicativePar)(identity),
          T.map((validated) =>
            pipe(
              validated.right,
              RA.head,
              E.fromOption(() => new Error("No attestation validation passed"))
            )
          )
        )
      )
    );

  validateAssertion = ({
    integrityAssertion,
    hardwareSignature,
    nonce,
    jwk,
    hardwareKeyTag,
    userId,
  }: ValidateAssertionRequest) =>
    pipe(
      sequenceS(RTE.ApplicativeSeq)({
        clientData: pipe(
          {
            challenge: nonce,
            jwk,
          },
          J.stringify,
          E.mapLeft(() => new Error("Unable to create clientData")),
          RTE.fromEither
        ),
        walletInstance: getWalletInstance(hardwareKeyTag, userId),
      }),
      RTE.chainW(({ clientData, walletInstance: { hardwareKey, signCount } }) =>
        pipe(
          [
            validateiOSAssertion(
              integrityAssertion,
              hardwareSignature,
              clientData,
              hardwareKey,
              signCount,
              this.#configuration.iOsBundleIdentifier,
              this.#configuration.iOsTeamIdentifier
            ),
            validateAndroidAssertion(
              integrityAssertion,
              hardwareSignature,
              clientData,
              hardwareKey,
              this.#configuration.androidBundleIdentifier,
              this.#configuration.androidPlayStoreCertificateHash,
              this.#configuration.googleAppCredentialsEncoded,
              this.#configuration.androidPlayIntegrityUrl,
              this.#configuration.allowDevelopmentEnvironment
            ),
          ],
          RA.wilt(T.ApplicativePar)(identity),
          T.map((validated) =>
            pipe(
              validated.right,
              RA.head,
              E.fromOption(() => new Error("No assertion validation passed"))
            )
          ),
          RTE.fromTaskEither
        )
      )
    );
}
export { ValidatedAttestation };
