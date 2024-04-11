import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { logErrorAndReturnResponse } from "../utils";
import { insertNonce, generateNonce } from "../../../nonce";

export const GetNonceHandler = H.of(() =>
  pipe(
    generateNonce(),
    TE.fromIO,
    RTE.fromTaskEither,
    RTE.chainFirstW(insertNonce),
    RTE.map((nonce) => ({ nonce })),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse)
  )
);
