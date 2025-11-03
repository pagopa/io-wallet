import * as H from "@pagopa/handler-kit";
import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceCreation/index";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as HtmlToText from "html-to-text";

import { getUserEmailByFiscalCode, sendEmailToUser } from "@/email";
import { sendTelemetryException } from "@/infra/telemetry";

const WALLET_ACTIVATION_EMAIL_TITLE =
  "Documenti su IO - Aggiungi i tuoi documenti al Portafoglio";
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

export const SendEmailOnWalletInstanceCreationHandler = H.of(
  (fiscalCode: FiscalCode) =>
    pipe(
      getUserEmailByFiscalCode(fiscalCode),
      RTE.chainW((emailAddress) =>
        sendEmailToUser({
          html: htmlContent,
          subject: WALLET_ACTIVATION_EMAIL_TITLE,
          text: HtmlToText.htmlToText(htmlContent, HTML_TO_TEXT_OPTIONS),
          to: emailAddress,
        }),
      ),
      RTE.orElseFirstW((error) =>
        RTE.fromIO(
          pipe(
            error,
            sendTelemetryException({
              fiscalCode,
              functionName: "sendEmailOnWalletInstanceCreation",
            }),
          ),
        ),
      ),
    ),
);
