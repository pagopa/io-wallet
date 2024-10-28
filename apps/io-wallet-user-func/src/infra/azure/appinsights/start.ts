import * as ai from "applicationinsights";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { metrics, trace } from "@opentelemetry/api";

ai.setup(process.env["AppInsightsConnectionString"])
  .setUseDiskRetryCaching(true)
  .start();

registerInstrumentations({
  tracerProvider: trace.getTracerProvider(),
  meterProvider: metrics.getMeterProvider(),
  instrumentations: [new UndiciInstrumentation()],
});

export default ai;
