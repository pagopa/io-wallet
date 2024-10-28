import { HttpHandler, HttpRequest, InvocationContext } from "@azure/functions";
import {
  Attributes,
  Span,
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
    const startTime = Date.now();

    // Extract the trace context from the incoming request
    const traceParent = req.headers.get("traceparent");
    const parts = traceParent?.split("-");

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

    const activeContext = context.active();

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

    const span: Span = trace
      .getTracer("ApplicationInsightsTracer")
      .startSpan(`${req.method} ${req.url}`, options, parentContext);

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
