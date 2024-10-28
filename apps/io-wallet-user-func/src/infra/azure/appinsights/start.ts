import { AzureFunctionsInstrumentation } from "@azure/functions-opentelemetry-instrumentation";
import { metrics, trace } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import * as ai from "applicationinsights";

ai.setup(process.env["AppInsightsConnectionString"])
  .setUseDiskRetryCaching(true)
  .start();

registerInstrumentations({
  instrumentations: [
    new UndiciInstrumentation(),
    new AzureFunctionsInstrumentation(),
  ],
  meterProvider: metrics.getMeterProvider(),
  tracerProvider: trace.getTracerProvider(),
});

export default ai;
