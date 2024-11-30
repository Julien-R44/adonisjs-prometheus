import type { ApplicationService } from '@adonisjs/core/types'

import type { ResolvedPromConfig as ResolvedPrometheusConfiguration } from '../src/types.js'
import { PrometheusMetricController } from '../src/controllers/prometheus_metric_controller.js'

/**
 * Prometheus provider
 */
export default class PrometheusProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Create route that will expose prometheus metrics
   */
  async #exposeMetricsEndpoint(config: ResolvedPrometheusConfiguration) {
    const router = await this.app.container.make('router')
    const endpointPath = config.endpoint || '/metrics'

    router.get(endpointPath, [PrometheusMetricController]).as('prometheus.metrics')
  }

  /**
   * - Resolve all collectors and register them
   * - Expose metrics endpoint
   */
  async boot() {
    const config = this.app.config.get<ResolvedPrometheusConfiguration>('prometheus')

    for (const collectorConfigProvider of config.collectors) {
      const collector = await collectorConfigProvider.resolver(this.app)
      collector.register()
    }

    await this.#exposeMetricsEndpoint(config)
  }
}
