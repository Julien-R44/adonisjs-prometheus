import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Metrics from './Metrics'

export class CollectPerformanceMetrics {
  protected metrics: Metrics

  constructor(protected config: any) {
    this.metrics = new Metrics(config)
  }

  public async handle({ request, response }: HttpContextContract, next: () => Promise<void>) {
    const { enabled: enableHttpMetric } = this.config.httpMetric
    const enableThroughputMetric = this.config.throughputMetric.enabled

    /**
     * Start HTTP request timer.
     */
    let stopHttpRequestTimer
    if (enableHttpMetric) {
      stopHttpRequestTimer = this.metrics.httpMetric.startTimer({
        method: request.method(),
        url: request.url(),
      })
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
    if (enableHttpMetric) {
      stopHttpRequestTimer({
        statusCode: response.response.statusCode,
      })
    }
  }
}
