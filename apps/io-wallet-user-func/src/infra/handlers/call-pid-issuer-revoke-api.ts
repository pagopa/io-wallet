import { revokeAllCredentials } from "@/credential";
import * as H from "@pagopa/handler-kit";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

export const CallPidIssuerRevokeApiHandler = H.of((fiscalCode: FiscalCode) =>
  pipe(
    fiscalCode,
    revokeAllCredentials,
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          fiscalCode,
          functionName: "callPidIssuerRevokeApi",
        }),
        RTE.fromReader,
      ),
    ),
  ),
);
