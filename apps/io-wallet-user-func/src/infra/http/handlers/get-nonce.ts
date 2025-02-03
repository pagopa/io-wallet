import { generateNonce, insertNonce } from "@/nonce";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

const GetNonceBody = t.type({
  fiscalCode: FiscalCode,
});

type GetNonceBody = t.TypeOf<typeof GetNonceBody>;

const requireGetNonceBody: (
  req: H.HttpRequest,
) => E.Either<Error, GetNonceBody> = (req) =>
  pipe(req.body, H.parse(GetNonceBody, "Invalid body supplied"));

export const GetNonceHandler = H.of((req: H.HttpRequest) =>
  pipe(
    generateNonce,
    RTE.fromIOEither,
    RTE.chainFirstW(insertNonce),
    RTE.map((nonce) => ({ nonce })),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          fiscalCode: pipe(
            req,
            requireGetNonceBody,
            E.map(({ fiscalCode }) => fiscalCode),
          ),
          functionName: "getNonce",
        }),
        RTE.fromReader,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
