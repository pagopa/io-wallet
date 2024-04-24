import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import * as TE from "fp-ts/lib/TaskEither";

export const User = t.type({
  id: NonEmptyString,
});

export type User = t.TypeOf<typeof User>;

export type UserRepository = {
  getUserByFiscalCode: (fiscalCode: FiscalCode) => TE.TaskEither<Error, User>;
  getFiscalCodeByUserId: (id: User["id"]) => TE.TaskEither<Error, FiscalCode>;
};
