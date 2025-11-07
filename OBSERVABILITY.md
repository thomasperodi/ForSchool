# OpenTelemetry Observability Setup

This project has been instrumented with OpenTelemetry for comprehensive observability including traces, metrics, and logs.

## Overview

The instrumentation provides:
- **Distributed Tracing**: Track requests across the entire application stack
- **Metrics Collection**: Monitor application performance and business metrics
- **Structured Logging**: Centralized logging with trace correlation
- **Automatic Instrumentation**: Zero-code instrumentation for common libraries

## Architecture

### Server-Side Instrumentation
- **File**: `otel-server.ts`
- **Initialization**: `instrumentation.ts` (Next.js instrumentation hook)
- **Features**: Node.js auto-instrumentation for HTTP, database, and framework calls

### Client-Side Instrumentation  
- **File**: `otel-client.ts`
- **Initialization**: `components/providers/OtelClientInit.tsx`
- **Features**: Browser instrumentation for fetch, XHR, and document load events

## Configuration

### Environment Variables

Set these environment variables to configure the OpenTelemetry exporters:

```bash
# OTLP Endpoint (defaults to http://localhost:4318)
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-observe-endpoint.com

# Authentication (optional)
OTEL_EXPORTER_OTLP_BEARER_TOKEN=your-bearer-token

# Client-side (Next.js public variables)
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT=https://your-observe-endpoint.com
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_BEARER_TOKEN=your-bearer-token
```

### Service Names
- Server: `forschool-app`
- Client: `forschool-client`

## Data Export

All telemetry data is exported via OTLP (OpenTelemetry Protocol) to the configured endpoint:
- **Traces**: `/v1/traces`
- **Metrics**: `/v1/metrics` 
- **Logs**: `/v1/logs`

## Observe.com Integration

The configuration includes custom headers for Observe.com:
- `x-observe-target-package: Tracing|Metrics|Logs`

## Automatic Instrumentation

The following libraries and frameworks are automatically instrumented:

### Server-Side
- HTTP/HTTPS requests and responses
- Express.js, Fastify, Koa, and other web frameworks
- Database connections (MySQL, PostgreSQL, MongoDB, etc.)
- Redis operations
- File system operations
- And many more Node.js libraries

### Client-Side
- Fetch API requests
- XMLHttpRequest calls
- Document load events
- User interactions (optional)

## Development

### Local Testing
1. Start a local OTLP collector (e.g., Jaeger, OTEL Collector)
2. Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
3. Run the application: `npm run dev`

### Production Deployment
1. Configure environment variables with your observability backend
2. Deploy the application normally
3. Telemetry data will be automatically collected and exported

## Troubleshooting

### Common Issues
1. **Missing telemetry data**: Check environment variables and network connectivity
2. **High memory usage**: Adjust batch sizes in exporter configurations
3. **Performance impact**: Disable specific instrumentations if needed

### Debug Logging
Enable debug logging by setting:
```bash
OTEL_LOG_LEVEL=debug
```

## Customization

To modify the instrumentation:
1. Edit `otel-server.ts` for server-side changes
2. Edit `otel-client.ts` for client-side changes
3. Restart the application to apply changes

## Support

For issues related to OpenTelemetry instrumentation, check:
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry JavaScript SDK](https://github.com/open-telemetry/opentelemetry-js)
