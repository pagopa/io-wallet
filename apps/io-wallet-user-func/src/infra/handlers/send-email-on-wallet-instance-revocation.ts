import * as H from "@pagopa/handler-kit";
import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceRevocation/index";
import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as HtmlToText from "html-to-text";
import * as t from "io-ts";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

import { DEFAULT_TIMEZONE, formatDate } from "@/datetime";
import { getUserEmailByFiscalCode, sendEmailToUser } from "@/email";

export const WalletInstanceRevocationQueueItem = t.type({
  fiscalCode: FiscalCode,
  revokedAt: IsoDateFromString,
});

type WalletInstanceRevocationQueueItem = t.TypeOf<
  typeof WalletInstanceRevocationQueueItem
>;

const WALLET_REVOCATION_EMAIL_TITLE =
  "Messaggi da IO: Documenti su IO disattivato";
const WALLET_REVOCATION_EMAIL_BLOCK_ACCESS_LINK =
  "https://account.ioapp.it/it/accedi/";

const HTML_TO_TEXT_OPTIONS: HtmlToText.HtmlToTextOptions = {
  selectors: [
    {
      format: "skip",
      selector: "img",
    },
  ],
  tables: true,
};

export const SendEmailOnWalletInstanceRevocationHandler = H.of(
  ({ fiscalCode, revokedAt }: WalletInstanceRevocationQueueItem) =>
    pipe(
      getUserEmailByFiscalCode(fiscalCode),
      RTE.chainW((emailAddress) =>
        pipe(
          htmlTemplate(
            formatDate(revokedAt, "HH:mm", DEFAULT_TIMEZONE),
            formatDate(revokedAt, "DD/MM/YYYY", DEFAULT_TIMEZONE),
            { href: WALLET_REVOCATION_EMAIL_BLOCK_ACCESS_LINK } as ValidUrl,
          ),
          (htmlContent) =>
            sendEmailToUser({
              html: htmlContent,
              subject: WALLET_REVOCATION_EMAIL_TITLE,
              text: HtmlToText.htmlToText(htmlContent, HTML_TO_TEXT_OPTIONS),
              to: emailAddress,
            }),
        ),
      ),
      RTE.orElseFirstW((error) =>
        pipe(
          sendTelemetryException(error, {
            fiscalCode,
            functionName: "sendEmailOnWalletInstanceRevocation",
            revokedAt,
          }),
          RTE.fromReader,
        ),
      ),
    ),
);
