import { AuthProfileApiConfig, MailConfig } from "@/app/config";
import { EmailNotificationService, SendEmailNotificationParams } from "@/email";
import {
  getMailerTransporter,
  sendMail,
} from "@pagopa/io-functions-commons/dist/src/mailer";
import { EmailString, FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

export class EmailNotificationServiceClient
  implements EmailNotificationService
{
  #authProfileApiConfig: AuthProfileApiConfig;
  #mailConfig: MailConfig;

  getUserEmail = (fiscalCode: FiscalCode) =>
    pipe(
      TE.tryCatch(
        async () => {
          const result = await fetch(
            new URL(
              `/api/v1/profiles/${fiscalCode}`,
              this.#authProfileApiConfig.baseURL,
            ),
            {
              headers: {
                "x-functions-key": this.#authProfileApiConfig.apiKey,
              },
              method: "GET",
              signal: AbortSignal.timeout(
                this.#authProfileApiConfig.httpRequestTimeout,
              ),
            },
          );
          if (!result.ok) {
            throw new Error(await result.text());
          }
          return result.json();
        },
        (error) =>
          new Error(
            `Error occurred while getting user email from profile service: ${error}`,
          ),
      ),
      TE.chainW(
        flow(
          t.type({
            email: EmailString,
          }).decode,
          TE.fromEither,
          TE.mapLeft((errors) => new Error(errors.join(", "))),
        ),
      ),
      TE.map(({ email }) => email),
    );

  sendEmail = (params: SendEmailNotificationParams) =>
    pipe(
      // required to comply with the constraints imposed by the MailupMailerConfig type from @pagopa/io-functions-commons
      {
        MAIL_FROM: this.#mailConfig.mailSender,
        MAIL_TRANSPORTS: undefined,
        MAILHOG_HOSTNAME: undefined,
        MAILUP_SECRET: this.#mailConfig.mailupSecret,
        MAILUP_USERNAME: this.#mailConfig.mailupUsername,
        NODE_ENV: "production",
        SENDGRID_API_KEY: undefined,
      },
      getMailerTransporter,
      (transporter) =>
        sendMail(transporter, {
          from: this.#mailConfig.mailSender,
          html: params.html,
          subject: params.subject,
          text: params.text,
          to: params.to,
        }),
    );

  constructor({
    authProfileApiConfig,
    mailConfig,
  }: {
    authProfileApiConfig: AuthProfileApiConfig;
    mailConfig: MailConfig;
  }) {
    this.#authProfileApiConfig = authProfileApiConfig;
    this.#mailConfig = mailConfig;
  }
}
