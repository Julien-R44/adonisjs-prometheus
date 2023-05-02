import * as prometheus from 'prom-client'
import { Metrics } from '../src/metrics.js'
import CollectMetricsMiddleware from '../src/collect_metrics_middleware.js'
import type { ApplicationService } from '@adonisjs/core/types'
import type { PrometheusConfig } from '../src/types.js'

/**
 * Prometheus provider
 */
export default class PrometheusProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Create route that will expose prometheus metrics
   */
  private async exposeMetricsEndpoint(config: PrometheusConfig) {
    if (config.exposeHttpEndpoint === false) {
      return
    }

    const router = await this.app.container.make('router')
    const urlPath = config.endpoint || '/metrics'

    router.get(urlPath, async ({ response }) => {
      const metrics = await prometheus.register.metrics()
      return response.header('Content-type', prometheus.register.contentType).ok(metrics)
    })
  }

  /**
   * Collect system metrics if enabled
   */
  private collectSystemMetrics(config: PrometheusConfig) {
    if (config.systemMetrics.enabled) {
      prometheus.collectDefaultMetrics(config.systemMetrics)
    }
  }

  public register(): void {
    prometheus.register.clear()

    const promConfig = this.app.config.get<PrometheusConfig>('prometheus', {})

    this.collectSystemMetrics(promConfig)
    this.exposeMetricsEndpoint(promConfig)

    const metrics = new Metrics(promConfig)
    if (promConfig.uptimeMetric.enabled) {
      metrics.uptimeMetric.inc(1)
    }

    this.app.container.bind(CollectMetricsMiddleware, () => {
      return new CollectMetricsMiddleware(metrics, promConfig)
    })
  }

  public async shutdown() {
    prometheus.register.clear()
  }
}
