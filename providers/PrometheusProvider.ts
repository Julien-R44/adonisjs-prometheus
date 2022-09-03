import * as prometheus from 'prom-client'
import type { ApplicationContract, IocContract } from '@ioc:Adonis/Core/Application'

export default class PrometheusProvider {
  public static needsApplication = true
  protected container: IocContract

  constructor(protected app: ApplicationContract) {
    this.container = app.container
  }

  public register(): void {
    const Config = this.app.container.resolveBinding('Adonis/Core/Config')

    const systemMetrics = Config.get('prometheus.systemMetrics')
    if (Config.get('prometheus.systemMetrics').enabled) {
      prometheus.collectDefaultMetrics(systemMetrics)
    }

    if (Config.get('prometheus.exposeHttpEndpoint')) {
      this.exposeMetrics(Config.get('prometheus.endpoint'))
    }

    this.app.container.singleton('Adonis/Prometheus', () => prometheus)
    this.app.container.singleton('Adonis/Prometheus/Middlewares/CollectPerformanceMetrics', () => {
      const { CollectPerformanceMetrics } = require('../src/CollectPerformanceMetrics')
      const { Metrics } = require('../src/Metrics')
      const config = this.container.use('Adonis/Core/Config').get('prometheus')

      const metrics = new Metrics(config)
      const enableUptimeMetric = config.uptimeMetric.enabled
      if (enableUptimeMetric) {
        metrics.uptimeMetric.inc(1)
      }

      return new CollectPerformanceMetrics(metrics, config)
    })
  }

  /**
   * Expose metrics on the given endpoint
   */
  private exposeMetrics(urlPath = '/metrics') {
    const router = this.app.container.resolveBinding('Adonis/Core/Route')

    router.get(urlPath, async ({ response }) => {
      response
        .header('Content-type', prometheus.register.contentType)
        .ok(await prometheus.register.metrics())
    })
  }
}
