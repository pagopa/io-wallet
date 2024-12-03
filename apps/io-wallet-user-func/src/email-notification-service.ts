import {
  MailerConfig,
  getMailerTransporter,
  sendMail,
} from "@pagopa/io-functions-commons/dist/src/mailer";
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

export interface IEmailNotificationService {
  getTransporter: (
    transporter: MailerConfig,
    params: SendEmailNotificationParams,
  ) => MailerConfig;
  sendEmail: (
    transporter: MailerConfig,
    params: SendEmailNotificationParams,
  ) => TE.TaskEither<Error, void>;
}

export class EmailNotificationService implements IEmailNotificationService {
  #configuration: MailConfig;

  getTransporter = () =>
    getMailerTransporter({
      MAIL_FROM: this.#configuration.mailSender,
      MAIL_TRANSPORTS: undefined, // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
      MAILHOG_HOSTNAME: undefined, // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
      MAILUP_SECRET: this.#configuration.mailupSecret,
      MAILUP_USERNAME: this.#configuration.mailupUsername,
      NODE_ENV: "production", // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
      SENDGRID_API_KEY: undefined, // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
    });

  sendEmail: (
    transporter: MailerConfig,
    params: SendEmailNotificationParams,
  ) => TE.TaskEither<Error, void> = (
    transporter: MailerConfig,
    params: SendEmailNotificationParams,
  ) =>
    sendMail(transporter, {
      from: this.#configuration.mailSender,
      html: params.html,
      subject: params.subject,
      text: params.text,
      to: params.to,
    });

  constructor(mailConfig: MailConfig) {
    this.#configuration = mailConfig;
  }
}
