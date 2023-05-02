import type { HttpContext } from '@adonisjs/core/http'

/**
 * Config for Prometheus
 */
export interface PrometheusConfig {
  /**
   * Should expose a metrics endpoint
   *
   * @default true
   */
  exposeHttpEndpoint?: boolean

  /**
   * Path to expose metrics endpoint
   *
   * @default /metrics
   */
  endpoint?: string

  /**
   * Should expose system metrics (CPU, Memory, etc)
   */
  systemMetrics: {
    enabled: boolean

    /**
     * Prefix for system metrics
     */
    prefix?: string
  }

  httpMetric: {
    enabled: boolean
    name: string
    includeQueryParams: boolean
    includeRouteParams: boolean
    shouldGroupStatusCode: boolean
    help: string
    labelNames: string[]
    buckets: number[]
    prefix: string
    excludedRoutes: string[] | ((ctx: HttpContext) => boolean)
  }

  uptimeMetric: {
    enabled: boolean
    name: string
    help: string
    prefix: string
  }

  throughputMetric: {
    enabled: boolean
    name: string
    help: string
    prefix: string
  }
}
