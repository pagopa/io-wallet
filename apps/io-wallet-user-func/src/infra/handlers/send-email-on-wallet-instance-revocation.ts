import {
  WALLET_REVOCATION_EMAIL_BLOCK_ACCESS_LINK,
  WALLET_REVOCATION_EMAIL_TITLE,
} from "@/app/config";
import { getUserEmailByFiscalCode, sendEmailToUser } from "@/email";
import * as H from "@pagopa/handler-kit";
import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceRevocation/index";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { format } from "date-fns";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as HtmlToText from "html-to-text";
import * as t from "io-ts";

export const WalletInstanceRevocationQueueItem = t.type({
  fiscalCode: FiscalCode,
  revokedAt: t.string,
});

type WalletInstanceRevocationQueueItem = t.TypeOf<
  typeof WalletInstanceRevocationQueueItem
>;

const HTML_TO_TEXT_OPTIONS: HtmlToTextOptions = {
  ignoreImage: true,
  tables: true,
};

const getRevocationTime = (datetime: Date) => format(datetime, "HH:mm");

const getRevocationDate = (datetime: Date) => format(datetime, "dd/MM/yyyy");

export const SendEmailOnWalletInstanceRevocationHandler = H.of(
  (queueItem: WalletInstanceRevocationQueueItem) =>
    pipe(
      getUserEmailByFiscalCode(queueItem.fiscalCode),
      RTE.chainW((emailAddress) =>
        pipe(
          htmlTemplate(
            getRevocationTime(new Date(queueItem.revokedAt)),
            getRevocationDate(new Date(queueItem.revokedAt)),
            { href: WALLET_REVOCATION_EMAIL_BLOCK_ACCESS_LINK } as ValidUrl,
          ),
          (htmlContent) =>
            sendEmailToUser({
              html: htmlContent,
              subject: WALLET_REVOCATION_EMAIL_TITLE,
              text: HtmlToText.fromString(htmlContent, HTML_TO_TEXT_OPTIONS),
              to: emailAddress,
            }),
        ),
      ),
    ),
);
