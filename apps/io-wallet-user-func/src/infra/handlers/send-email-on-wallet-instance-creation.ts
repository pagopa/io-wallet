import * as H from "@pagopa/handler-kit";
import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceCreation/index";
import { apply as htmlTemplateGeneric } from "@pagopa/io-app-email-templates/WalletInstanceCreation/index"; // TODO
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
import { checkIfFiscalCodeIsWhitelisted } from "@/whitelisted-fiscal-code";

const WALLET_ACTIVATION_EMAIL_TITLE =
  "Documenti su IO - Aggiungi i tuoi documenti al Portafoglio";
const WALLET_ACTIVATION_GENERIC_EMAIL_TITLE =
  "Novità su IO - i tuoi documenti digitali";

const WALLET_ACTIVATION_EMAIL_FAQ_LINK =
  "https://io.italia.it/documenti-su-io/faq/";
const WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK =
  "https://account.ioapp.it/it/accedi/?refresh=true";

const HTML_TO_TEXT_OPTIONS: HtmlToText.HtmlToTextOptions = {
  selectors: [
    {
      format: "skip",
      selector: "img",
    },
  ],
  tables: true,
};

const htmlContent = htmlTemplate(
  { href: WALLET_ACTIVATION_EMAIL_FAQ_LINK } as ValidUrl,
  { href: WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK } as ValidUrl,
);

const htmlContentGeneric = htmlTemplateGeneric(
  { href: WALLET_ACTIVATION_EMAIL_FAQ_LINK } as ValidUrl,
  { href: WALLET_ACTIVATION_EMAIL_HANDLE_ACCESS_LINK } as ValidUrl,
);

// it provides a message specific to Documenti su IO
const sendEmail: (
  emailAddress: string,
) => RTE.ReaderTaskEither<
  { emailNotificationService: EmailNotificationService },
  Error,
  void
> = (emailAddress) =>
  sendEmailToUser({
    html: htmlContent,
    subject: WALLET_ACTIVATION_EMAIL_TITLE,
    text: HtmlToText.htmlToText(htmlContent, HTML_TO_TEXT_OPTIONS),
    to: emailAddress,
  });

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
      RTE.chainW((emailAddress) =>
        pipe(
          fiscalCode,
          checkIfFiscalCodeIsWhitelisted,
          RTE.chainW(({ whitelisted }) =>
            whitelisted
              ? sendGenericEmail(emailAddress)
              : sendEmail(emailAddress),
          ),
        ),
      ),
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
