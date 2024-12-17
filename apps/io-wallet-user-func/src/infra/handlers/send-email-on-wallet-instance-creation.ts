import {
  WALLET_ACTIVATION_EMAIL_FAQ_LINK,
  WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK,
  WALLET_ACTIVATION_EMAIL_TITLE,
} from "@/app/config";
import { getUserEmailByFiscalCode, sendEmailToUser } from "@/email";
import * as H from "@pagopa/handler-kit";
import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceCreation/index";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";

export const SendEmailOnWalletInstanceCreationHandler = H.of(
  (fiscalCode: FiscalCode) =>
    pipe(
      getUserEmailByFiscalCode(fiscalCode),
      RTE.chainW((emailAddress) =>
        sendEmailToUser({
          html: htmlTemplate(
            { href: WALLET_ACTIVATION_EMAIL_FAQ_LINK } as ValidUrl,
            { href: WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK } as ValidUrl,
          ),
          subject: WALLET_ACTIVATION_EMAIL_TITLE,
          text: WALLET_ACTIVATION_EMAIL_TITLE,
          to: emailAddress,
        }),
      ),
    ),
);
