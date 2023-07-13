import { flow } from "fp-ts/function";
import * as H from "@pagopa/handler-kit";

export const successJwt = flow(
  H.success,
  H.withHeader("Content-Type", "application/entity-statement+jwt")
);

export const createdJwt = flow(
  H.createdJson,
  H.withHeader("Content-Type", "application/entity-statement+jwt")
);
