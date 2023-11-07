import { Counter, Gauge, Histogram } from 'prom-client'

import type { PrometheusConfig } from './types.js'

export class Metrics {
  /**
   * Total time each HTTP request takes.
   */
  httpMetric: Histogram<string> | undefined

  /**
   * Uptime performance of the application.
   */
  uptimeMetric: Gauge<string> | undefined

  /**
   * No. of request handled.
   */
  throughputMetric: Counter<string> | undefined

  constructor(protected config: PrometheusConfig) {
    if (config.httpMetric.enabled) {
      this.httpMetric = new Histogram(config.httpMetric)
    }

    if (config.uptimeMetric.enabled) {
      this.uptimeMetric = new Gauge(config.uptimeMetric)
    }

    if (config.throughputMetric.enabled) {
      this.throughputMetric = new Counter(config.throughputMetric)
    }
  }
}
