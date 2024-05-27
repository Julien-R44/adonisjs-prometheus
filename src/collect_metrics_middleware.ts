import type { Histogram } from 'prom-client'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import type { Metrics } from './metrics.js'
import type { PrometheusConfig } from './types.js'

type MetricStartTimerReturn = ReturnType<Histogram['startTimer']>

export default class CollectMetricsMiddleware {
  constructor(
    protected metrics: Metrics,
    protected config: PrometheusConfig,
  ) {}

  /**
   * Check if current route is excluded by the user in the configuration
   */
  #isRouteExcluded(ctx: HttpContext): boolean {
    const excludedRoutes = this.config.httpMetric.excludedRoutes || []

    if (typeof excludedRoutes === 'function') {
      return excludedRoutes(ctx)
    }

    return excludedRoutes.includes(ctx.route!.pattern)
  }

  /**
   * Called when the request is finished.
   */
  async #afterRequest(statusCode: number, stopHttpRequestTimer?: MetricStartTimerReturn) {
    const enableThroughputMetric = this.config.throughputMetric.enabled
    const httpMetricOptions = this.config.httpMetric

    /**
     * Track request throughput..
     */
    if (enableThroughputMetric) this.metrics.throughputMetric!.inc()

    /**
     * End HTTP request timer.
     */
    if (httpMetricOptions.enabled && stopHttpRequestTimer) {
      let statusCodeStr = statusCode.toString()
      if (httpMetricOptions.shouldGroupStatusCode) {
        statusCodeStr = `${statusCodeStr[0]}xx`
      }

      stopHttpRequestTimer({ statusCode: statusCodeStr })
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const { request, response, route } = ctx
    const httpMetricOptions = this.config.httpMetric

    /**
     * Start HTTP request timer ( if route not excluded ) with the
     * given options for url parsing.
     * The timer will be stopped when the request is finished.
     */

    let stopHttpRequestTimer: MetricStartTimerReturn | undefined
    if (httpMetricOptions.enabled && !this.#isRouteExcluded(ctx)) {
      const includeRouteParams = httpMetricOptions.includeRouteParams
      const includeQueryParams = httpMetricOptions.includeQueryParams

      let url = includeRouteParams ? request.url() : route?.pattern
      if (includeQueryParams && request.parsedUrl.query) {
        url += `?${request.parsedUrl.query}`
      }

      stopHttpRequestTimer = this.metrics.httpMetric!.startTimer({
        method: request.method(),
        url,
      })
    }

    /**
     * Execute request and track metrics for the request.
     *
     * If the request fails with any error, we have to catch
     * this error, track metrics, then rethrow the error.
     */
    try {
      await next()
      this.#afterRequest(response.response.statusCode, stopHttpRequestTimer)
    } catch (err) {
      this.#afterRequest(err.status || 500, stopHttpRequestTimer)
      throw err
    }
  }
}
