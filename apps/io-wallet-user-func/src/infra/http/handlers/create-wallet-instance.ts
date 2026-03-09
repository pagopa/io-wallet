import { QueueClient } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import { flow, pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

import {
  AttestationService,
  validateAttestation,
  ValidatedAttestation,
} from "@/attestation-service";
import { revokeAllCredentials } from "@/credential";
import { enqueue } from "@/infra/azure/storage/queue";
import { sendTelemetryExceptionWithBody } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import {
  insertWalletInstance,
  revokeUserValidWalletInstancesExceptOne,
} from "@/wallet-instance";
import { consumeNonce, WalletInstanceRequest } from "@/wallet-instance-request";

const WalletInstanceRequestPayload = t.intersection([
  t.type({
    challenge: NonEmptyString,
    fiscal_code: FiscalCode,
    hardware_key_tag: NonEmptyString,
    key_attestation: NonEmptyString,
  }),
  t.partial({ is_renewal: t.boolean }),
]);

type WalletInstanceRequestPayload = t.TypeOf<
  typeof WalletInstanceRequestPayload
>;

const requireWalletInstanceRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletInstanceRequestPayload),
    E.chain(
      ({
        challenge,
        fiscal_code,
        hardware_key_tag,
        is_renewal,
        key_attestation,
      }) =>
        sequenceS(E.Apply)({
          challenge: E.right(challenge),
          fiscalCode: E.right(fiscal_code),
          hardwareKeyTag: E.right(hardware_key_tag),
          isRenewal: E.right(is_renewal ?? false),
          keyAttestation: E.right(key_attestation),
        }),
    ),
  );

const sendEmail: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<{ queueClient: QueueClient }, Error, void> = enqueue;

export const CreateWalletInstanceHandler = H.of((req: H.HttpRequest) =>
  pipe(
    req,
    requireWalletInstanceRequest,
    RTE.fromEither,
    RTE.chainW((walletInstanceRequest) =>
      pipe(
        consumeNonce(walletInstanceRequest.challenge),
        RTE.chainW(() =>
          isLoadTestUser(walletInstanceRequest.fiscalCode)
            ? skipAttestationValidation(walletInstanceRequest)
            : validateAttestation(walletInstanceRequest),
        ),
        RTE.bind("walletInstance", ({ deviceDetails, hardwareKey }) =>
          RTE.right({
            createdAt: new Date(),
            deviceDetails,
            hardwareKey,
            id: walletInstanceRequest.hardwareKeyTag,
            isRevoked: false as const,
            signCount: 0,
            userId: walletInstanceRequest.fiscalCode,
          }),
        ),
        RTE.chainW(({ walletInstance }) =>
          pipe(
            insertWalletInstance(walletInstance),
            RTE.chainW(() =>
              pipe(
                revokeAllCredentials(walletInstanceRequest.fiscalCode),
                RTE.orElseW(
                  flow(
                    sendTelemetryExceptionWithBody({
                      body: req.body,
                      functionName: "createWalletInstance",
                    }),
                    E.fold(
                      () => E.right(undefined),
                      () => E.right(undefined),
                    ),
                    RTE.fromEither,
                  ),
                ),
              ),
            ),
            RTE.chainW(() =>
              revokeUserValidWalletInstancesExceptOne(
                walletInstanceRequest.fiscalCode,
                walletInstanceRequest.hardwareKeyTag,
                walletInstanceRequest.isRenewal
                  ? "WALLET_INSTANCE_RENEWAL"
                  : "NEW_WALLET_INSTANCE_CREATED",
              ),
            ),
            RTE.chainW(() =>
              walletInstanceRequest.isRenewal
                ? RTE.right(undefined)
                : sendEmail(walletInstanceRequest.fiscalCode),
            ),
          ),
        ),
      ),
    ),
    RTE.map(() => H.empty),
    RTE.orElseFirstW(
      flow(
        sendTelemetryExceptionWithBody({
          body: req.body,
          functionName: "createWalletInstance",
        }),
        RTE.fromEither,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);

const skipAttestationValidation: (
  walletInstanceRequest: WalletInstanceRequest,
) => RTE.ReaderTaskEither<
  { attestationService: AttestationService },
  Error,
  ValidatedAttestation
> =
  (walletInstanceRequest) =>
  ({ attestationService }) =>
    pipe(
      attestationService.getHardwarePublicTestKey(),
      TE.map((hardwareKey) => ({
        createdAt: new Date(),
        deviceDetails: {
          platform: "ios",
        },
        hardwareKey,
        id: walletInstanceRequest.hardwareKeyTag,
        isRevoked: false as const,
        signCount: 0,
        userId: walletInstanceRequest.fiscalCode,
      })),
    );
