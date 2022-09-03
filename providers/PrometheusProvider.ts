import * as prometheus from 'prom-client'
import { Metrics } from '../src/Metrics'
import type { PrometheusConfig } from '@ioc:Adonis/Prometheus'
import type { ApplicationContract, IocContract } from '@ioc:Adonis/Core/Application'

export default class PrometheusProvider {
  public static needsApplication = true
  protected container: IocContract

  constructor(protected app: ApplicationContract) {
    this.container = app.container
  }

  /**
   * Expose metrics on the given endpoint
   */
  private exposeMetricsEndpoint(config: PrometheusConfig) {
    if (config.exposeHttpEndpoint === false) {
      return
    }

    const router = this.app.container.resolveBinding('Adonis/Core/Route')
    const urlPath = config.endpoint || '/metrics'

    router.get(urlPath, async ({ response }) => {
      response
        .header('Content-type', prometheus.register.contentType)
        .ok(await prometheus.register.metrics())
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
    const promConfig: PrometheusConfig = this.app.container
      .resolveBinding('Adonis/Core/Config')
      .get('prometheus')

    this.collectSystemMetrics(promConfig)
    this.exposeMetricsEndpoint(promConfig)

    const metrics = new Metrics(promConfig)
    if (promConfig.uptimeMetric.enabled) {
      metrics.uptimeMetric.inc(1)
    }

    this.app.container.singleton('Adonis/Prometheus', () => prometheus)
    this.app.container.singleton('Adonis/Prometheus/Middlewares/CollectPerformanceMetrics', () => {
      const { CollectPerformanceMetrics } = require('../src/CollectPerformanceMetrics')
      return new CollectPerformanceMetrics(metrics, promConfig)
    })
  }

  public async shutdown() {
    prometheus.register.clear()
  }
}
