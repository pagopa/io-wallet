import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

export const SendEmailParams = t.type({
  html: t.string,
  subject: t.string,
  text: t.string,
  to: t.string,
});

export type SendEmailNotificationParams = t.TypeOf<typeof SendEmailParams>;

export interface IEmailNotificationService {
  sendEmail: (
    params: SendEmailNotificationParams,
  ) => TE.TaskEither<Error, void>;
}
