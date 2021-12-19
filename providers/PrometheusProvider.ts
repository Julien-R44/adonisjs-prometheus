import { ApplicationContract, IocContract } from '@ioc:Adonis/Core/Application'
import * as prometheus from 'prom-client'

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
      const { enabled, ...params } = systemMetrics
      prometheus.collectDefaultMetrics(params)
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

  private exposeMetrics(urlPath: string = '/metrics') {
    const router = this.app.container.resolveBinding('Adonis/Core/Route')

    router.get(urlPath, async ({ response }) => {
      response
        .header('Content-type', prometheus.register.contentType)
        .ok(await prometheus.register.metrics())
    })
  }
}
