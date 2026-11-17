import * as H from "@pagopa/handler-kit";
import { apply as htmlTemplateGeneric } from "@pagopa/io-app-email-templates/ItWalletWelcome/index";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as HtmlToText from "html-to-text";

import {
  EmailNotificationService,
  getUserEmailByFiscalCode,
  sendEmailToUser,
} from "@/email";
import { sendTelemetryException } from "@/infra/telemetry";

const WALLET_ACTIVATION_GENERIC_EMAIL_TITLE =
  "Ottieni il meglio del tuo portafoglio digitale su IO";

const WALLET_ACTIVATION_EMAIL_FAQ_LINK = "https://ioapp.it";
const WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK =
  "https://account.ioapp.it/it/accedi/?refresh=true";
const HELP_CENTER_LINK = "https://assistenza.ioapp.it/hc/it";

const HTML_TO_TEXT_OPTIONS: HtmlToText.HtmlToTextOptions = {
  selectors: [
    {
      format: "skip",
      selector: "img",
    },
  ],
  tables: true,
};

const htmlContentGeneric = htmlTemplateGeneric(
  { href: HELP_CENTER_LINK } as ValidUrl,
  { href: WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK } as ValidUrl,
  { href: WALLET_ACTIVATION_EMAIL_FAQ_LINK } as ValidUrl,
);

// it provides a generic message that works for both IT Wallet and Documenti su IO
const sendGenericEmail: (
  emailAddress: string,
) => RTE.ReaderTaskEither<
  { emailNotificationService: EmailNotificationService },
  Error,
  void
> = (emailAddress) =>
  sendEmailToUser({
    html: htmlContentGeneric,
    subject: WALLET_ACTIVATION_GENERIC_EMAIL_TITLE,
    text: HtmlToText.htmlToText(htmlContentGeneric, HTML_TO_TEXT_OPTIONS),
    to: emailAddress,
  });

export const SendEmailOnWalletInstanceCreationHandler = H.of(
  (fiscalCode: FiscalCode) =>
    pipe(
      fiscalCode,
      getUserEmailByFiscalCode,
      RTE.chainW(sendGenericEmail),
      RTE.orElseFirstW(
        flow(
          sendTelemetryException({
            fiscalCode,
            functionName: "sendEmailOnWalletInstanceCreation",
          }),
          RTE.fromEither,
        ),
      ),
    ),
);
