import {
  WALLET_ACTIVATION_EMAIL_FAQ_LINK,
  WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
  WALLET_ACTIVATION_EMAIL_SUBJECT,
  WALLET_ACTIVATION_EMAIL_TEXT,
} from "@/app/config";
import { SendEmailNotificationParams } from "@/email-notification-service";
import WalletInstanceActivationEmailTemplate from "@/templates/wallet-instance-activation/index.html";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

import { EmailNotificationService } from "../email-notification-service";

// [SIW-1560] to do - a mock function that return the user email by the fiscal code
const getUserEmailByFiscalCode = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fiscalCode: string,
): RTE.ReaderTaskEither<object, Error, string> =>
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
    emailNotificationService.sendEmail(params);

export const SendEmailOnWalletInstanceCreationHandler = H.of(
  (fiscalCode: FiscalCode) =>
    pipe(
      getUserEmailByFiscalCode(fiscalCode),
      RTE.chainW((emailAddress) =>
        sendEmailToUser({
          html: WalletInstanceActivationEmailTemplate(
            WALLET_ACTIVATION_EMAIL_FAQ_LINK,
            WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
          ),
          subject: WALLET_ACTIVATION_EMAIL_SUBJECT,
          text: WALLET_ACTIVATION_EMAIL_TEXT,
          to: emailAddress,
        }),
      ),
    ),
);
