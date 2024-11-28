import {
  getMailerTransporter,
  sendMail,
} from "@pagopa/io-functions-commons/dist/src/mailer";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
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
    pipe(
      TE.tryCatch(
        async () => {
          if (!configs.mail.enabled) {
            return;
          }

          const mailTransporter = await getMailerTransporter({
            MAIL_FROM: configs.mail.mailSender,
            MAIL_TRANSPORTS: undefined,
            MAILHOG_HOSTNAME: configs.mail.mailhogHost?.length
              ? configs.mail.mailhogHost
              : undefined,
            MAILUP_SECRET: configs.mail.mailupSecret?.length
              ? configs.mail.mailupSecret
              : undefined,
            MAILUP_USERNAME: configs.mail.mailupUsername?.length
              ? configs.mail.mailupUsername
              : undefined,
            NODE_ENV: "development",
            SENDGRID_API_KEY: undefined,
          } as never);

          await sendMail(mailTransporter, {
            from: configs.mail.mailSender,
            html,
            subject,
            text,
            to,
          })();
        },
        (error) => new Error(String(error)),
      ),
    );
