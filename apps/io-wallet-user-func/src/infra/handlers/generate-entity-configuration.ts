import { getEntityConfiguration } from "@/entity-configuration";
import * as H from "@pagopa/handler-kit";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/lib/ReaderTaskEither";
import { sendTelemetryException } from "io-wallet-common/infra/azure/appinsights/telemetry";

export const GenerateEntityConfigurationHandler = H.of(() =>
  pipe(
    getEntityConfiguration,
    RTE.orElseFirstW((error) =>
      pipe(
        sendTelemetryException(error, {
          functionName: "generateEntityConfiguration",
        }),
        RTE.fromReader,
      ),
    ),
  ),
);
