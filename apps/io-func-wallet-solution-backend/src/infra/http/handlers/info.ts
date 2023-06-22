import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";

import * as H from "@pagopa/handler-kit";

export const InfoHandler = H.of((_: H.HttpRequest) =>
  pipe(RTE.right({ message: "it works!" }), RTE.map(H.successJson))
);
