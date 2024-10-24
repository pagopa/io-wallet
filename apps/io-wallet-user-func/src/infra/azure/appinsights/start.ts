import { metrics, trace } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import * as ai from "applicationinsights";

registerInstrumentations({
  instrumentations: [new UndiciInstrumentation()],
  meterProvider: metrics.getMeterProvider(),
  tracerProvider: trace.getTracerProvider(),
});

ai.setup(process.env["AppInsightsConnectionString"])
  .setUseDiskRetryCaching(true)
  .start();

export default ai;
