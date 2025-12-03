import type { CommonCollectorOptions, ExemplarLabels } from './types.js'

export function mergeCommonAndCollectorOptions(
  commonOptions: CommonCollectorOptions,
  collectorOptions: any,
) {
  return { ...commonOptions, ...collectorOptions }
}

let otelApi: typeof import('@opentelemetry/api') | undefined

/**
 * Try to dynamically import @opentelemetry/api.
 * Returns undefined if the package is not installed.
 */
export async function tryLoadOpenTelemetry(): Promise<
  typeof import('@opentelemetry/api') | undefined
> {
  if (otelApi !== undefined) return otelApi

  try {
    otelApi = await import('@opentelemetry/api').then((mod) => mod).catch(() => undefined)
    return otelApi
  } catch {
    return undefined
  }
}

/**
 * Get the current trace and span IDs from OpenTelemetry context.
 * Returns undefined if OpenTelemetry is not available or there's no active span.
 */
export function getExemplarLabelsFromOtel(
  otel: typeof import('@opentelemetry/api'),
): ExemplarLabels | undefined {
  const span = otel.trace.getSpan(otel.context.active())
  if (!span) return undefined

  const spanContext = span.spanContext()
  if (!spanContext.traceId || !spanContext.spanId) return undefined

  return { traceId: spanContext.traceId, spanId: spanContext.spanId }
}
