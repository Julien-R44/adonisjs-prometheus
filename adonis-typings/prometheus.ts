declare module '@ioc:Adonis/Prometheus' {
  export * from 'prom-client'
  import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

  export interface PrometheusConfig {
    exposeHttpEndpoint: boolean
    endpoint: string

    systemMetrics: {
      enabled: boolean
      prefix: string
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
      excludedRoutes: string[] | ((ctx: HttpContextContract) => boolean)
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
}
