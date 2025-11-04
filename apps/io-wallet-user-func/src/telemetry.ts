import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/lib/Either";
import * as t from "io-ts";

import { sendTelemetryException } from "@/infra/telemetry";

const getFiscalCode: (input: unknown) => FiscalCode | undefined = (input) =>
  pipe(
    t.type({ fiscal_code: FiscalCode }).decode(input),
    E.fold(
      () => undefined,
      (decoded) => decoded.fiscal_code,
    ),
  );

// it sends an exception to the Application Insights logs along with the request body
// if the fiscal_code is present in the body, it is sent separately for better query on logs
export const sendTelemetryExceptionWithBody: (input: {
  body: unknown;
  functionName: string;
}) => (error: Error) => E.Either<Error, void> =
  ({ body, functionName }) =>
  (error) =>
    pipe(body, getFiscalCode, (fiscalCode) =>
      fiscalCode
        ? sendTelemetryException({ body, fiscalCode, functionName })(error)
        : sendTelemetryException({ body, functionName })(error),
    );
