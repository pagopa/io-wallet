import * as H from "@pagopa/handler-kit";
import { flow } from "fp-ts/function";

export const successEntityStatementJwt = flow(
  H.success,
  H.withHeader("Content-Type", "application/entity-statement+jwt"),
);

export const successJwt = flow(
  H.success,
  H.withHeader("Content-Type", "application/jwt"),
);
