import {
  WALLET_REVOCATION_EMAIL_BLOCK_ACCESS_LINK,
  WALLET_REVOCATION_EMAIL_TITLE,
} from "@/app/config";
import { getUserEmailByFiscalCode, sendEmailToUser } from "@/email";
import * as H from "@pagopa/handler-kit";
import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceRevocation/index";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as HtmlToText from "html-to-text";
import * as t from "io-ts";

export const WalletInstanceRevocationQueueItem = t.type({
  fiscalCode: FiscalCode,
  revocationDatetime: t.string,
});

type WalletInstanceRevocationQueueItem = t.TypeOf<
  typeof WalletInstanceRevocationQueueItem
>;

const HTML_TO_TEXT_OPTIONS: HtmlToTextOptions = {
  ignoreImage: true,
  tables: true,
};

// [SIW-1936] to do - this is a mock method
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getTime = (datetime: string) => "HH:mm";

// [SIW-1936] to do - this is a mock method
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getDate = (datetime: string) => "DD/MM/YYYY";

export const SendEmailOnWalletInstanceRevocationHandler = H.of(
  (queueItem: WalletInstanceRevocationQueueItem) =>
    pipe(
      getUserEmailByFiscalCode(queueItem.fiscalCode),
      RTE.chainW((emailAddress) =>
        pipe(
          htmlTemplate(
            queueItem.fiscalCode,
            getTime(queueItem.revocationDatetime),
            getDate(queueItem.revocationDatetime),
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
