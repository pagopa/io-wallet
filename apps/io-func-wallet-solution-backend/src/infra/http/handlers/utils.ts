import { flow } from "fp-ts/function";
import * as H from "@pagopa/handler-kit";

export const successEntityStatementJwt = flow(
  H.success,
  H.withHeader("Content-Type", "application/entity-statement+jwt")
);

export const createdEntityStatementJwt = flow(
  H.createdJson,
  H.withHeader("Content-Type", "application/entity-statement+jwt")
);
