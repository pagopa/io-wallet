import { generateNonce, insertNonce } from "@/nonce";
import * as H from "@pagopa/handler-kit";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

export const GetNonceHandler = H.of(() =>
  pipe(
    generateNonce,
    RTE.fromIOEither,
    RTE.chainFirstW(insertNonce),
    RTE.map((nonce) => ({ nonce })),
    RTE.map(H.successJson),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
