import { HttpHandler, HttpRequest, InvocationContext } from "@azure/functions";
import {
  Attributes,
  SpanContext,
  SpanKind,
  SpanOptions,
  SpanStatusCode,
  TraceFlags,
  context,
  trace,
} from "@opentelemetry/api";

// this wrapper enables logging of requests to Application Insights
export default function withAppInsights(func: HttpHandler) {
  return async (req: HttpRequest, invocationContext: InvocationContext) => {
    let span;
    let activeContext;

    try {
      const startTime = Date.now();

      // Extract the trace context from the incoming request
      const traceParent = req.headers.get("traceparent");
      const parts = traceParent?.split("-");

      // 'traceparent' contains 4 parts:
      // - parts[0]: version (e.g., "00")
      // - parts[1]: traceId (32 characters, 16 bytes, hexadecimal)
      // - parts[2]: spanId (16 characters, 8 bytes, hexadecimal)
      // - parts[3]: traceFlags (indicates whether the trace is sampled)
      const parentSpanContext: SpanContext | null =
        parts &&
        parts.length === 4 &&
        parts[1].length === 32 &&
        parts[2].length === 16
          ? {
              spanId: parts[2],
              traceFlags: TraceFlags.NONE,
              traceId: parts[1],
            }
          : null;

      activeContext = context.active();

      // Set span context as the parent context if any
      const parentContext = parentSpanContext
        ? trace.setSpanContext(activeContext, parentSpanContext)
        : activeContext;

      const attributes: Attributes = {
        ["http.method"]: "HTTP",
        ["http.url"]: req.url,
      };

      const options: SpanOptions = {
        attributes: attributes,
        kind: SpanKind.SERVER,
        startTime: startTime,
      };

      span = trace
        .getTracer("ApplicationInsightsTracer")
        .startSpan(`${req.method} ${req.url}`, options, parentContext);
    } catch (error) {
      // If there is an error creating the span, just execute the function
      return await func(req, invocationContext);
    }

    let res;
    try {
      res = await context.with(
        trace.setSpan(activeContext, span),
        async () => await func(req, invocationContext),
      );
      const status = res?.status;
      if (status) {
        span.setStatus({
          code: status < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.setAttribute("http.status_code", status);
      }
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : JSON.stringify(error),
      });
      throw error;
    } finally {
      span.end(Date.now());
    }

    return res;
  };
}
