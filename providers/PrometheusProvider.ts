import * as prometheus from 'prom-client'
import type { ApplicationContract, IocContract } from '@ioc:Adonis/Core/Application'
import type { ConfigContract } from '@ioc:Adonis/Core/Config'

export default class PrometheusProvider {
  public static needsApplication = true
  protected container: IocContract

  constructor(protected app: ApplicationContract) {
    this.container = app.container
  }

  /**
   * Expose metrics on the given endpoint
   */
  private exposeMetricsEndpoint(Config: ConfigContract) {
    if (Config.get('prometheus.exposeHttpEndpoint') === false) {
      return
    }

    const router = this.app.container.resolveBinding('Adonis/Core/Route')
    const urlPath = Config.get('prometheus.endpoint') || '/metrics'

    router.get(urlPath, async ({ response }) => {
      response
        .header('Content-type', prometheus.register.contentType)
        .ok(await prometheus.register.metrics())
    })
  }

  /**
   * Collect system metrics if enabled
   */
  private collectSystemMetrics(Config: ConfigContract) {
    const systemMetrics = Config.get('prometheus.systemMetrics')
    if (systemMetrics.enabled) {
      prometheus.collectDefaultMetrics(systemMetrics)
    }
  }

  public register(): void {
    const Config = this.app.container.resolveBinding('Adonis/Core/Config')

    this.collectSystemMetrics(Config)
    this.exposeMetricsEndpoint(Config)

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
}
