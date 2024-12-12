import { EmailString, FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";

const SendEmailNotificationParams = t.type({
  html: t.string,
  subject: t.string,
  text: t.string,
  to: t.string,
});

export type SendEmailNotificationParams = t.TypeOf<
  typeof SendEmailNotificationParams
>;

export interface IEmailNotificationService {
  sendEmail: (
    params: SendEmailNotificationParams,
  ) => TE.TaskEither<Error, void>;
}

export const sendEmailToUser: (
  params: SendEmailNotificationParams,
) => RTE.ReaderTaskEither<
  { emailNotificationService: IEmailNotificationService },
  Error,
  void
> =
  (params) =>
  ({ emailNotificationService }) =>
    emailNotificationService.sendEmail(params);

export type GetEmail = (
  fiscalCode: FiscalCode,
) => TE.TaskEither<Error, EmailString>;

export const getUserEmailByFiscalCode: (
  fiscalCode: FiscalCode,
) => RTE.ReaderTaskEither<{ getEmail: GetEmail }, Error, string> =
  (fiscalCode) =>
  ({ getEmail }) =>
    pipe(fiscalCode, getEmail);
