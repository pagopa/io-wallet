import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

const getFiscalCode: (input: unknown) => FiscalCode | undefined = (body) =>
  pipe(
    t.type({ fiscal_code: FiscalCode }).decode(body),
    E.fold(
      () => undefined,
      (decoded) => decoded.fiscal_code,
    ),
  );

// it sends an exception to the Application Insights logs
// if the fiscal code is available, it is sent along with the request data
export const logException = (error: Error, payload: unknown) =>
  pipe(
    payload,
    getFiscalCode,
    (fiscalCode) =>
      fiscalCode
        ? sendTelemetryException(error, { fiscalCode, payload })
        : sendTelemetryException(error, { payload }),
    RTE.fromReader,
  );
