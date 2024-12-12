import { AuthProfileApiConfig, MailConfig } from "@/app/config";
import {
  GetEmail,
  IEmailNotificationService,
  SendEmailNotificationParams,
} from "@/email";
import {
  getMailerTransporter,
  sendMail,
} from "@pagopa/io-functions-commons/dist/src/mailer";
import { EmailString } from "@pagopa/ts-commons/lib/strings";
import { flow, pipe } from "fp-ts/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

export const getEmail: (config: AuthProfileApiConfig) => GetEmail =
  (config) => (fiscalCode) =>
    pipe(
      TE.tryCatch(
        async () => {
          const result = await fetch(
            new URL(`/api/v1/profiles/${fiscalCode}`, config.baseURL),
            {
              headers: {
                "x-functions-key": config.apiKey,
              },
              method: "GET",
              signal: AbortSignal.timeout(config.httpRequestTimeout),
            },
          );
          if (!result.ok) {
            throw new Error(JSON.stringify(await result.json()));
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

export class EmailNotificationService implements IEmailNotificationService {
  #configuration: MailConfig;

  sendEmail: (
    params: SendEmailNotificationParams,
  ) => TE.TaskEither<Error, void> = (params: SendEmailNotificationParams) =>
    this.#configuration.mailFeatureFlag
      ? pipe(
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
        )
      : TE.right(undefined);

  constructor(mailConfig: MailConfig) {
    this.#configuration = mailConfig;
  }
}
