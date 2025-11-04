import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import {
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
} from "@opentelemetry/semantic-conventions";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";
import * as E from "fp-ts/Either";

const DEFAULT_LOGGER = "ApplicationInsightsLogger";

export const sendTelemetryException: (
  properties?: Record<string, unknown>,
) => (error: Error) => E.Either<Error, void> = (properties) => (error) =>
  E.tryCatch(() => {
    logs.getLogger(DEFAULT_LOGGER).emit({
      attributes: {
        [ATTR_EXCEPTION_MESSAGE]: error.message,
        [ATTR_EXCEPTION_STACKTRACE]: error.stack,
        [ATTR_EXCEPTION_TYPE]: error.name,
        ...properties,
      },
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
    });
  }, E.toError);

export const sendTelemetryCustomEvent: (event: {
  name: string;
  properties: Record<string, string>;
}) => E.Either<Error, void> = ({ name, properties }) =>
  E.tryCatch(() => {
    emitCustomEvent(name, properties)(DEFAULT_LOGGER);
  }, E.toError);
