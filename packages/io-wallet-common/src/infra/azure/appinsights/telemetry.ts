import * as appInsights from "applicationinsights";

export const sendTelemetryException =
  (error: Error, properties?: Record<string, unknown>) =>
  (r: { telemetryClient: appInsights.TelemetryClient }) =>
    r.telemetryClient.trackException({
      exception: error,
      properties,
    });

export const sendTelemetryEvent: (
  event: appInsights.Contracts.EventTelemetry,
) => (r: { telemetryClient: appInsights.TelemetryClient }) => void =
  (event) =>
  ({ telemetryClient }) =>
    telemetryClient.trackEvent(event);
