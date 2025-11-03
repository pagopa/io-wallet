import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import {
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
} from "@opentelemetry/semantic-conventions";
import * as IO from "fp-ts/IO";

const DEFAULT_LOGGER = "ApplicationInsightsLogger";

export const sendTelemetryException: (
  properties?: Record<string, unknown>,
) => (error: Error) => IO.IO<void> = (properties) => (error) => () => {
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
};

export const sendTelemetryCustomEvent: (event: {
  name: string;
  properties?: Record<string, unknown>;
}) => IO.IO<void> =
  ({ name, properties }) =>
  () => {
    logs.getLogger(DEFAULT_LOGGER).emit({
      attributes: {
        eventName: name,
        ...properties,
      },
      body: name,
      severityNumber: SeverityNumber.INFO,
      severityText: "INFO",
    });
  };
