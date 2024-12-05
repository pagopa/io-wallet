import { MailConfig } from "@/app/config";
import {
  IEmailNotificationService,
  SendEmailNotificationParams,
} from "@/email-notification-service";
import {
  getMailerTransporter,
  sendMail,
} from "@pagopa/io-functions-commons/dist/src/mailer";
import * as TE from "fp-ts/lib/TaskEither";

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
    params: SendEmailNotificationParams,
  ) => TE.TaskEither<Error, void> = (params: SendEmailNotificationParams) =>
    sendMail(this.getTransporter(), {
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
