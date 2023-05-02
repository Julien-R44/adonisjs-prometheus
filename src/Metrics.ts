import { Counter, Gauge, Histogram } from 'prom-client'
import type { PrometheusConfig } from './types.js'

export class Metrics {
  /**
   * Total time each HTTP request takes.
   */
  public httpMetric: Histogram<string>

  /**
   * Uptime performance of the application.
   */
  public uptimeMetric: Gauge<string>

  /**
   * No. of request handled.
   */
  public throughputMetric: Counter<string>

  constructor(protected config: PrometheusConfig) {
    this.httpMetric = new Histogram(config.httpMetric)
    this.uptimeMetric = new Gauge(config.uptimeMetric)
    this.throughputMetric = new Counter(config.throughputMetric)
  }
}
