/**
 * OpenTelemetry Usage Examples
 * 
 * This file demonstrates how to use OpenTelemetry APIs for custom instrumentation
 * in your application. These examples show how to create custom traces, metrics,
 * and logs beyond the automatic instrumentation.
 */

import { trace, context, SpanStatusCode, metrics } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";

// Get the global tracer, meter, and logger
const tracer = trace.getTracer("forschool-custom");
const meter = metrics.getMeter("forschool-custom");
const logger = logs.getLogger("forschool-custom");

// Create custom metrics
const requestCounter = meter.createCounter("custom_requests_total", {
  description: "Total number of custom requests",
});

const responseTimeHistogram = meter.createHistogram("custom_response_time", {
  description: "Response time for custom operations",
  unit: "ms",
});

/**
 * Example 1: Custom Span with Manual Instrumentation
 */
export async function processUserData(userId: string, data: any) {
  const span = tracer.startSpan("process_user_data", {
    attributes: {
      "user.id": userId,
      "data.type": typeof data,
    },
  });

  try {
    // Set the span as active in the current context
    return await context.with(trace.setSpan(context.active(), span), async () => {
      const startTime = Date.now();

      // Add custom attributes during processing
      span.setAttributes({
        "data.size": JSON.stringify(data).length,
        "operation": "user_data_processing",
      });

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Record metrics
      requestCounter.add(1, { operation: "process_user_data" });
      responseTimeHistogram.record(Date.now() - startTime, { 
        operation: "process_user_data" 
      });

      // Log the operation
      logger.emit({
        severityNumber: SeverityNumber.INFO,
        severityText: "INFO",
        body: "User data processed successfully",
        attributes: {
          "user.id": userId,
          "processing.duration_ms": Date.now() - startTime,
        },
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return { success: true, userId };
    });
  } catch (error) {
    // Record error in span
    span.recordException(error as Error);
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: (error as Error).message 
    });

    // Log the error
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
      body: "Failed to process user data",
      attributes: {
        "user.id": userId,
        "error.message": (error as Error).message,
      },
    });

    throw error;
  } finally {
    span.end();
  }
}

/**
 * Example 2: Database Operation with Custom Instrumentation
 */
export async function getUserFromDatabase(userId: string) {
  const span = tracer.startSpan("get_user_from_db", {
    attributes: {
      "db.operation": "SELECT",
      "db.table": "users",
      "user.id": userId,
    },
  });

  try {
    const startTime = Date.now();

    // Simulate database call
    const user = await simulateDbCall(userId);

    const duration = Date.now() - startTime;
    
    // Record database metrics
    const dbQueryHistogram = meter.createHistogram("db_query_duration", {
      description: "Database query duration",
      unit: "ms",
    });
    
    dbQueryHistogram.record(duration, {
      "db.operation": "SELECT",
      "db.table": "users",
    });

    span.setAttributes({
      "db.rows_affected": user ? 1 : 0,
      "db.duration_ms": duration,
    });

    return user;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Example 3: Business Metrics
 */
export function recordBusinessMetrics(eventType: string, value: number, attributes: Record<string, string> = {}) {
  // Create business-specific metrics
  const businessEventCounter = meter.createCounter("business_events_total", {
    description: "Total business events",
  });

  const businessValueGauge = meter.createUpDownCounter("business_value", {
    description: "Business value metrics",
  });

  businessEventCounter.add(1, { event_type: eventType, ...attributes });
  businessValueGauge.add(value, { event_type: eventType, ...attributes });

  // Log business event
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: "INFO",
    body: `Business event recorded: ${eventType}`,
    attributes: {
      "event.type": eventType,
      "event.value": value,
      ...attributes,
    },
  });
}

// Helper function to simulate database call
async function simulateDbCall(userId: string) {
  await new Promise(resolve => setTimeout(resolve, 50));
  return { id: userId, name: "Test User" };
}
