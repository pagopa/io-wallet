import * as H from "@pagopa/handler-kit";
import { apply as htmlTemplateGeneric } from "@pagopa/io-app-email-templates/ItWalletInstanceRevocation/index";
import { apply as htmlTemplate } from "@pagopa/io-app-email-templates/WalletInstanceRevocation/index";
import { IsoDateFromString } from "@pagopa/ts-commons/lib/dates";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { ValidUrl } from "@pagopa/ts-commons/lib/url";
import { flow, pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as HtmlToText from "html-to-text";
import * as t from "io-ts";

import { DEFAULT_TIMEZONE, formatDate } from "@/datetime";
import {
  EmailNotificationService,
  getUserEmailByFiscalCode,
  sendEmailToUser,
} from "@/email";
import { sendTelemetryException } from "@/infra/telemetry";
import { checkIfFiscalCodeIsWhitelisted } from "@/whitelisted-fiscal-code";

export const WalletInstanceRevocationQueueItem = t.type({
  fiscalCode: FiscalCode,
  revokedAt: IsoDateFromString,
});

type WalletInstanceRevocationQueueItem = t.TypeOf<
  typeof WalletInstanceRevocationQueueItem
>;

const WALLET_REVOCATION_EMAIL_TITLE =
  "Messaggio da IO: Documenti su IO disattivato";
const WALLET_REVOCATION_GENERIC_EMAIL_TITLE =
  "Messaggio da IO: documenti digitali rimossi";

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

const sendEmail: (input: {
  emailAddress: string;
  revokedAt: Date;
}) => RTE.ReaderTaskEither<
  { emailNotificationService: EmailNotificationService },
  Error,
  void
> = ({ emailAddress, revokedAt }) =>
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
  );

const sendGenericEmail: (input: {
  emailAddress: string;
  revokedAt: Date;
}) => RTE.ReaderTaskEither<
  { emailNotificationService: EmailNotificationService },
  Error,
  void
> = ({ emailAddress, revokedAt }) =>
  pipe(
    htmlTemplateGeneric(
      "", // no name
      formatDate(revokedAt, "HH:mm", DEFAULT_TIMEZONE),
      formatDate(revokedAt, "DD/MM/YYYY", DEFAULT_TIMEZONE),
      { href: WALLET_REVOCATION_EMAIL_BLOCK_ACCESS_LINK } as ValidUrl,
    ),
    (htmlContent) =>
      sendEmailToUser({
        html: htmlContent,
        subject: WALLET_REVOCATION_GENERIC_EMAIL_TITLE,
        text: HtmlToText.htmlToText(htmlContent, HTML_TO_TEXT_OPTIONS),
        to: emailAddress,
      }),
  );

export const SendEmailOnWalletInstanceRevocationHandler = H.of(
  ({ fiscalCode, revokedAt }: WalletInstanceRevocationQueueItem) =>
    pipe(
      fiscalCode,
      getUserEmailByFiscalCode,
      RTE.chainW((emailAddress) =>
        pipe(
          fiscalCode,
          checkIfFiscalCodeIsWhitelisted,
          RTE.chainW(({ whitelisted }) =>
            whitelisted
              ? sendGenericEmail({ emailAddress, revokedAt })
              : sendEmail({ emailAddress, revokedAt }),
          ),
        ),
      ),
      RTE.orElseFirstW(
        flow(
          sendTelemetryException({
            fiscalCode,
            functionName: "sendEmailOnWalletInstanceRevocation",
          }),
          RTE.fromEither,
        ),
      ),
    ),
);
