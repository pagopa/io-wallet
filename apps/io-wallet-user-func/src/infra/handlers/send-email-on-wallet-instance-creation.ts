import {
  WALLET_ACTIVATION_EMAIL_FAQ_LINK,
  WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
  WALLET_ACTIVATION_EMAIL_SUBJECT,
  WALLET_ACTIVATION_EMAIL_TEXT,
} from "@/app/config";
import { getUserEmailByFiscalCode, sendEmailToUser } from "@/email";
import WalletInstanceActivationEmailTemplate from "@/templates/wallet-instance-activation/index.html";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

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
