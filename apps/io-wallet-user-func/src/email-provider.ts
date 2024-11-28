import emailTemplate from "@/templates/wallet-instance-activation/index.html";
import {
  getMailerTransporter,
  sendMail,
} from "@pagopa/io-functions-commons/dist/src/mailer";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { MailConfig } from "./app/config";

export const sendEmail: (
  fiscalCode: string,
) => RTE.ReaderTaskEither<{ mail: MailConfig }, Error, void> =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (fiscalCode) => (configs) =>
    pipe(
      TE.tryCatch(
        async () => {
          if (!configs.mail.enabled) {
            return;
          }
          const userEmail = ""; // to do - get the email by fiscalCode

          const mailTransporter = await getMailerTransporter({
            MAIL_FROM: configs.mail.mailhogHost?.length
              ? configs.mail.mailSender
              : userEmail,
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
            html: emailTemplate(
              "to do", // faq link
              "to do", // access link
            ),
            subject:
              "IT Wallet - Aggiungi i tuoi documenti al Portafoglio di IO",
            text: "IT Wallet - Aggiungi i tuoi documenti al Portafoglio di IO",
            to: "test@test.test", // userEmail,
          })();
        },
        (error) => new Error(String(error)),
      ),
    );
