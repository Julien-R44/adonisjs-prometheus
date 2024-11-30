import type { HttpContext } from '@adonisjs/core/http'
import type { ConfigProvider } from '@adonisjs/core/types'
import type { DefaultMetricsCollectorConfiguration, Registry } from 'prom-client'

import type { Collector } from './collectors/collector.js'

export interface PrometheusConfiguration {
  /**
   * Endpoint on which metrics will be exposed
   *
   * @default '/metrics'
   */
  endpoint?: string

  /**
   * Prefix for metrics
   */
  metricsPrefix?: string

  /**
   * Registry for metrics
   *
   * @default prometheus.register
   */
  registry?: Registry

  /**
   * List of IPs allowed to access metrics endpoint
   *
   * If empty, everyone can access the endpoint
   */
  ipsWhitelist?: string[]

  /**
   * List of collectors to be used
   */
  collectors?: ConfigProvider<Collector>[]
}

export type ResolvedPromConfig = {
  [K in keyof PrometheusConfiguration]-?: Exclude<PrometheusConfiguration[K], undefined>
}

export type CommonCollectorOptions = Pick<ResolvedPromConfig, 'metricsPrefix' | 'registry'>

/**
 * HTTP collector
 */
export interface HttpCollectorOptions {
  shouldGroupStatusCode?: boolean
  excludedRoutes?: string[] | ((ctx: HttpContext) => boolean)
  requestDuration?: { buckets?: number[] }
}

/**
 * System collector
 */
export type SystemCollectorOptions = DefaultMetricsCollectorConfiguration<any>

/**
 * Lucid collector
 */
export type LucidCollectorOptions = {
  queryDuration?: { buckets?: number[] }
}
