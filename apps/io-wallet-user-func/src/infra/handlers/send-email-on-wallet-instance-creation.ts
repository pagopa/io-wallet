import {
  // WALLET_ACTIVATION_EMAIL_FAQ_LINK,
  // WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
  WALLET_ACTIVATION_EMAIL_SUBJECT,
  WALLET_ACTIVATION_EMAIL_TEXT,
} from "@/app/config";
import { getUserEmailByFiscalCode, sendEmailToUser } from "@/email";
import * as H from "@pagopa/handler-kit";
// [SIW-1560] - work in progress
// import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceCreation/index";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

export const SendEmailOnWalletInstanceCreationHandler = H.of(
  (fiscalCode: FiscalCode) =>
    pipe(
      getUserEmailByFiscalCode(fiscalCode),
      RTE.chainW((emailAddress) =>
        sendEmailToUser({
          // [SIW-1560] - get the WalletInstanceCreation email template from @pagopa/io-wallet-email
          html: "",
          // [SIW-1560] - work in progress
          // htmlTemplate(
          //  WALLET_ACTIVATION_EMAIL_FAQ_LINK,
          //  WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
          // ),
          subject: WALLET_ACTIVATION_EMAIL_SUBJECT,
          text: WALLET_ACTIVATION_EMAIL_TEXT,
          to: emailAddress,
        }),
      ),
    ),
);
