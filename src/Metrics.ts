import * as prometheus from 'prom-client'

export class Metrics {
  /**
   * Total time each HTTP request takes.
   */
  public httpMetric: prometheus.Histogram<string>

  /**
   * Uptime performance of the application.
   */
  public uptimeMetric: prometheus.Gauge<string>

  /**
   * No. of request handled.
   */
  public throughputMetric: prometheus.Counter<string>

  constructor(protected config: any) {
    this.httpMetric = new prometheus.Histogram(config.httpMetric)

    this.uptimeMetric = new prometheus.Gauge(config.uptimeMetric)

    this.throughputMetric = new prometheus.Counter(config.throughputMetric)
  }
}
