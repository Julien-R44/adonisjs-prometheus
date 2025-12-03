import { register, Registry } from 'prom-client'

import type { PrometheusConfiguration, ResolvedPromConfig } from './types.js'

function buildMetricsPrefix(prefix: string | undefined): string {
  if (!prefix) return ''
  return prefix.endsWith('_') ? prefix : `${prefix}_`
}

/**
 * Define config for Prometheus package
 */
export function defineConfig(config: PrometheusConfiguration): ResolvedPromConfig {
  const registry = config.registry || register

  /**
   * Switch to OpenMetrics format when exemplars are enabled
   */
  if (config.enableExemplars) {
    // @ts-expect-error Seems broken types in prom-client
    registry.setContentType(Registry.OPENMETRICS_CONTENT_TYPE)
  }

  return {
    endpoint: config.endpoint || '/metrics',
    collectors: config.collectors || [],
    ipsWhitelist: config.ipsWhitelist || [],
    metricsPrefix: buildMetricsPrefix(config.metricsPrefix),
    registry,
    enableExemplars: config.enableExemplars || false,
  }
}
