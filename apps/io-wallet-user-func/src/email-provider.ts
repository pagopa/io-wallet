import {
  MailerTransporter,
  sendMail,
} from "@pagopa/io-functions-commons/dist/src/mailer";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

import { MailConfig } from "./app/config";

export const SendEmailParams = t.type({
  html: t.string,
  subject: t.string,
  text: t.string,
  to: t.string,
});

export type SendEmailNotificationParams = t.TypeOf<typeof SendEmailParams>;

export const sendEmailNotification: (
  transporter: MailerTransporter,
  params: SendEmailNotificationParams,
) => RTE.ReaderTaskEither<{ mail: MailConfig }, Error, void> =
  (transporter, { html, subject, text, to }) =>
  (configs) =>
    configs.mail.mailFeatureFlag
      ? sendMail(transporter, {
          from: configs.mail.mailSender,
          html,
          subject,
          text,
          to,
        })
      : TE.right(undefined);
