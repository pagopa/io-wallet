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
import { pipe } from "fp-ts/lib/function";

export class EmailNotificationService implements IEmailNotificationService {
  #configuration: MailConfig;

  sendEmail: (
    params: SendEmailNotificationParams,
  ) => TE.TaskEither<Error, void> = (params: SendEmailNotificationParams) =>
    pipe(
      // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
      {
        MAIL_FROM: this.#configuration.mailSender,
        MAIL_TRANSPORTS: undefined,
        MAILHOG_HOSTNAME: undefined,
        MAILUP_SECRET: this.#configuration.mailupSecret,
        MAILUP_USERNAME: this.#configuration.mailupUsername,
        NODE_ENV: "production",
        SENDGRID_API_KEY: undefined,
      },
      getMailerTransporter,
      (transporter) =>
        sendMail(transporter, {
          from: this.#configuration.mailSender,
          html: params.html,
          subject: params.subject,
          text: params.text,
          to: params.to,
        }),
    );

  constructor(mailConfig: MailConfig) {
    this.#configuration = mailConfig;
  }
}
