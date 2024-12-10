import {
  WALLET_ACTIVATION_EMAIL_FAQ_LINK,
  WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
  WALLET_ACTIVATION_EMAIL_SUBJECT,
  WALLET_ACTIVATION_EMAIL_TEXT,
} from "@/app/config";
import { SendEmailNotificationParams } from "@/email-notification-service";
import WalletInstanceActivationEmailTemplate from "@/templates/wallet-instance-activation/index.html";
import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { WalletInstance } from "io-wallet-common/wallet-instance";

import { EmailNotificationService } from "../email-notification-service";

// [SIW-1560] to do - a mock function that return the user email by the fiscal code
const getUserInfoByFiscalCode = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fiscalCode: string,
): RTE.ReaderTaskEither<object, Error, { email: string; firstName: string }> =>
  RTE.left(new Error("Not implemented yet"));

export const sendEmailToUser: (
  params: SendEmailNotificationParams,
) => RTE.ReaderTaskEither<
  { emailNotificationService: EmailNotificationService },
  Error,
  void
> =
  (params) =>
  ({ emailNotificationService }) =>
    pipe(params, emailNotificationService.sendEmail);

export const SendEmailOnWalletInstanceCreationHandler = H.of(
  (walletInstance: WalletInstance) =>
    pipe(
      getUserInfoByFiscalCode(walletInstance.userId),
      RTE.chainW(({ email, firstName }) =>
        sendEmailToUser({
          html: WalletInstanceActivationEmailTemplate(
            firstName,
            WALLET_ACTIVATION_EMAIL_FAQ_LINK,
            WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
          ),
          subject: WALLET_ACTIVATION_EMAIL_SUBJECT,
          text: WALLET_ACTIVATION_EMAIL_TEXT,
          to: email,
        }),
      ),
    ),
);
