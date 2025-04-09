import { isFiscalCodeWhitelisted } from "@/fiscal-code";
import * as H from "@pagopa/handler-kit";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import { lookup } from "fp-ts/Record";
import { pipe } from "fp-ts/function";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";
import { logErrorAndReturnResponse } from "io-wallet-common/infra/http/error";

export const requireFiscalCode: (
  req: H.HttpRequest,
) => E.Either<Error, NonEmptyString> = (req) =>
  pipe(
    req.path,
    lookup("fiscalCode"),
    E.fromOption(
      () => new H.HttpBadRequestError(`Missing "fiscalCode" in path`),
    ),
    E.chainW(H.parse(NonEmptyString, `Invalid "fiscalCode" supplied`)),
  );

export const IsFiscalCodeWhitelistedHandler = H.of((req: H.HttpRequest) =>
  pipe(
    pipe(req, requireFiscalCode),
    RTE.fromEither,
    RTE.chain(isFiscalCodeWhitelisted),
    RTE.map(H.successJson),
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "IsFiscalCodeWhitelisted",
        }),
        RTE.fromReader,
      ),
    ),
    RTE.orElseW(logErrorAndReturnResponse),
  ),
);
