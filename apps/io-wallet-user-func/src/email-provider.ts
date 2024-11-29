import {
  getMailerTransporter,
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

export type SendEmailParams = t.TypeOf<typeof SendEmailParams>;

export const sendEmail: (
  params: SendEmailParams,
) => RTE.ReaderTaskEither<{ mail: MailConfig }, Error, void> =
  ({ html, subject, text, to }) =>
  (configs) =>
    configs.mail.mailFeatureFlag
      ? sendMail(
          getMailerTransporter({
            MAIL_FROM: configs.mail.mailSender,
            MAIL_TRANSPORTS: undefined,
            MAILHOG_HOSTNAME: undefined,
            MAILUP_SECRET: configs.mail.mailupSecret,
            MAILUP_USERNAME: configs.mail.mailupUsername,
            NODE_ENV: "production",
            SENDGRID_API_KEY: undefined,
          } as never),
          {
            from: configs.mail.mailSender,
            html,
            subject,
            text,
            to,
          },
        )
      : TE.right(undefined);
