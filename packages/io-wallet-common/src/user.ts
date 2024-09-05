import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

export const User = t.type({
  id: NonEmptyString,
});

export type User = t.TypeOf<typeof User>;
