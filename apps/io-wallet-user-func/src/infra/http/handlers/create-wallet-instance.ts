import {
  MailConfig,
  WALLET_ACTIVATION_EMAIL_FAQ_LINK,
  WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
  WALLET_ACTIVATION_EMAIL_SUBJECT,
  WALLET_ACTIVATION_EMAIL_TEXT,
} from "@/app/config";
import {
  AttestationService,
  ValidatedAttestation,
  validateAttestation,
} from "@/attestation-service";
import { sendEmail } from "@/email-provider";
import { sendExceptionWithBodyToAppInsights } from "@/telemetry";
import WalletInstanceActivationEmailTemplate from "@/templates/wallet-instance-activation/index.html";
import { isLoadTestUser } from "@/user";
import {
  insertWalletInstance,
  revokeUserValidWalletInstancesExceptOne,
} from "@/wallet-instance";
import { WalletInstanceRequest, consumeNonce } from "@/wallet-instance-request";
import * as H from "@pagopa/handler-kit";
import {
  MailerTransporter,
  getMailerTransporter,
} from "@pagopa/io-functions-commons/dist/src/mailer";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { sequenceS } from "fp-ts/Apply";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

const WalletInstanceRequestPayload = t.type({
  challenge: NonEmptyString,
  fiscal_code: FiscalCode,
  hardware_key_tag: NonEmptyString,
  key_attestation: NonEmptyString,
});

type WalletInstanceRequestPayload = t.TypeOf<
  typeof WalletInstanceRequestPayload
>;

// const getUserEmailByFiscalCode = (
//   fiscalCode: string,
// ): TE.TaskEither<Error, string> => TE.right(`${fiscalCode}@test.test`); // to do - [SIW-1560] get the user email by the fiscal code

export const getTransporter: () => RTE.ReaderTaskEither<
  { mail: MailConfig },
  Error,
  MailerTransporter
> = () => (configs) =>
  TE.tryCatch(
    async () =>
      await getMailerTransporter({
        MAIL_FROM: configs.mail.mailSender,
        MAIL_TRANSPORTS: undefined, // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
        MAILHOG_HOSTNAME: undefined, // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
        MAILUP_SECRET: configs.mail.mailupSecret,
        MAILUP_USERNAME: configs.mail.mailupUsername,
        NODE_ENV: "production", // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
        SENDGRID_API_KEY: undefined, // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
      }),
    (error) => new Error(`Error getting the mailer transporter: ${error}`),
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
              revokeUserValidWalletInstancesExceptOne(
                walletInstanceRequest.fiscalCode,
                walletInstanceRequest.hardwareKeyTag,
                "NEW_WALLET_INSTANCE_CREATED",
              ),
            ),
            RTE.chainW(() =>
              pipe(
                getTransporter(),
                RTE.chain((transporter) =>
                  sendEmail(transporter, {
                    html: WalletInstanceActivationEmailTemplate(
                      WALLET_ACTIVATION_EMAIL_FAQ_LINK,
                      WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
                    ),
                    subject: WALLET_ACTIVATION_EMAIL_SUBJECT,
                    text: WALLET_ACTIVATION_EMAIL_TEXT,
                    to: "test@test.test", // to do - [SIW-1560] get the user email by the fiscal code
                  }),
                ),
              ),
            ),
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
