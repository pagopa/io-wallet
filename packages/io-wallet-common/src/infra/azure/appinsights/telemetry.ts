import * as appInsights from "applicationinsights";

export const sendTelemetryException =
  (error: Error, properties?: Record<string, unknown>) =>
  (r: { telemetryClient: appInsights.TelemetryClient }) =>
    r.telemetryClient.trackException({
      exception: error,
      properties,
    });
