import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Metrics } from './Metrics'

export class CollectPerformanceMetrics {
  constructor(protected metrics: Metrics, protected config: any) {}

  public async handle(
    { request, response, route }: HttpContextContract,
    next: () => Promise<void>
  ) {
    const httpMetricOptions = this.config.httpMetric
    const enableThroughputMetric = this.config.throughputMetric.enabled

    /**
     * Start HTTP request timer.
     */
    let stopHttpRequestTimer
    if (httpMetricOptions.enabled) {
      const includeRouteParams = httpMetricOptions.includeRouteParams
      const includeQueryParams = httpMetricOptions.includeQueryParams
      const excludedRoutes = httpMetricOptions.excludedRoutes || []

      if (!excludedRoutes.includes(route?.pattern)) {
        let url = includeRouteParams ? request.url() : route?.pattern

        if (includeQueryParams && request.parsedUrl.query) {
          url += `?${request.parsedUrl.query}`
        }

        stopHttpRequestTimer = this.metrics.httpMetric.startTimer({
          method: request.method(),
          url,
        })
      }
    }

    /**
     * Continue execution.
     */
    await next()

    /**
     * Track request throughput..
     */
    if (enableThroughputMetric) this.metrics.throughputMetric.inc()

    /**
     * End HTTP request timer.
     */
    if (httpMetricOptions.enabled && stopHttpRequestTimer) {
      stopHttpRequestTimer({
        statusCode: response.response.statusCode,
      })
    }
  }
}
