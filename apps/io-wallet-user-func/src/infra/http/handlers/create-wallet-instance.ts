import {
  AttestationService,
  ValidatedAttestation,
  validateAttestation,
} from "@/attestation-service";
import { enqueue } from "@/infra/azure/storage/queue";
import { sendExceptionWithBodyToAppInsights } from "@/telemetry";
import { isLoadTestUser } from "@/user";
import {
  WalletInstanceEnvironment,
  insertWalletInstance,
  revokeUserValidWalletInstancesExceptOne,
} from "@/wallet-instance";
import { WalletInstanceRequest, consumeNonce } from "@/wallet-instance-request";
import { QueueClient } from "@azure/storage-queue";
import * as H from "@pagopa/handler-kit";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";
import { WalletInstance } from "io-wallet-common/wallet-instance";

const WalletInstanceRequestPayload = t.type({
  challenge: NonEmptyString,
  fiscal_code: FiscalCode,
  hardware_key_tag: NonEmptyString,
  key_attestation: NonEmptyString,
});

type WalletInstanceRequestPayload = t.TypeOf<
  typeof WalletInstanceRequestPayload
>;

const sendCreationEmail =
  (
    fiscalCode: string,
  ): RTE.ReaderTaskEither<{ queueCreationClient: QueueClient }, Error, void> =>
  ({ queueCreationClient }) =>
    pipe({ queueClient: queueCreationClient }, enqueue(fiscalCode));

const revokeWalletInstances = (walletInstance: {
  fiscalCode: WalletInstance["userId"];
  hardwareKeyTag: WalletInstance["id"];
}): RTE.ReaderTaskEither<WalletInstanceEnvironment, Error, void> =>
  pipe(
    revokeUserValidWalletInstancesExceptOne(
      walletInstance.fiscalCode,
      walletInstance.hardwareKeyTag,
      "NEW_WALLET_INSTANCE_CREATED",
    ),
  );

const requireWalletInstanceRequest = (req: H.HttpRequest) =>
  pipe(
    req.body,
    H.parse(WalletInstanceRequestPayload),
    E.chain(({ challenge, fiscal_code, hardware_key_tag, key_attestation }) =>
      sequenceS(E.Apply)({
        challenge: E.right(challenge),
        fiscalCode: E.right(fiscal_code),
        hardwareKeyTag: E.right(hardware_key_tag),
        keyAttestation: E.right(key_attestation),
      }),
    ),
  );

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
              revokeWalletInstances({
                fiscalCode: walletInstanceRequest.fiscalCode,
                hardwareKeyTag: walletInstanceRequest.hardwareKeyTag,
              }),
            ),
            RTE.chainW(() => sendCreationEmail(walletInstance.userId)),
          ),
        ),
      ),
    ),
    RTE.map(() => H.empty),
    RTE.orElseFirstW((error) =>
      sendExceptionWithBodyToAppInsights(
        error,
        req.body,
        "createWalletInstance",
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
