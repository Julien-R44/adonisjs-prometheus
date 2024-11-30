import { register } from 'prom-client'

import type { PrometheusConfiguration, ResolvedPromConfig } from './types.js'

function buildMetricsPrefix(prefix: string | undefined): string {
  if (!prefix) return ''
  return prefix.endsWith('_') ? prefix : `${prefix}_`
}

/**
 * Define config for Prometheus package
 */
export function defineConfig(config: PrometheusConfiguration): ResolvedPromConfig {
  return {
    endpoint: config.endpoint || '/metrics',
    collectors: config.collectors || [],
    ipsWhitelist: config.ipsWhitelist || [],
    metricsPrefix: buildMetricsPrefix(config.metricsPrefix),
    registry: config.registry || register,
  }
}
