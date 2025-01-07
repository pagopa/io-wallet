import {
  // WALLET_REVOCATION_EMAIL_BLOCK_ACCESS_LINK, // [SIW-1936] to do - uncomment this line
  WALLET_REVOCATION_EMAIL_TITLE,
} from "@/app/config";
import { getUserEmailByFiscalCode, sendEmailToUser } from "@/email";
import * as H from "@pagopa/handler-kit";
// import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceRevocation/index"; // [SIW-1936] to do - uncomment this line
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
// import { ValidUrl } from "@pagopa/ts-commons/lib/url"; // [SIW-1936] to do - uncomment this line
// import { format } from "date-fns"; // [SIW-1936] to do - uncomment this line
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

// const getRevocationTime = (datetime: Date) => format(datetime, "HH:mm"); // [SIW-1936] to do - uncomment this line

// const getRevocationDate = (datetime: Date) => format(datetime, "dd/MM/yyyy"); // [SIW-1936] to do - uncomment this line

export const SendEmailOnWalletInstanceRevocationHandler = H.of(
  (queueItem: WalletInstanceRevocationQueueItem) =>
    pipe(
      getUserEmailByFiscalCode(queueItem.fiscalCode),
      RTE.chainW((emailAddress) =>
        pipe(
          // htmlTemplate(
          //   queueItem.fiscalCode,
          //   getRevocationTime(new Date(queueItem.revocationDatetime)),
          //   getRevocationDate(new Date(queueItem.revocationDatetime)),
          //   { href: WALLET_REVOCATION_EMAIL_BLOCK_ACCESS_LINK } as ValidUrl,
          // ),
          "", // [SIW-1936] to do - uncomment the prev lines
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
