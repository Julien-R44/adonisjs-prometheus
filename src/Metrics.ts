import * as prometheus from 'prom-client'

export default class Metrics {
  public httpMetric: prometheus.Histogram<string>
  public uptimeMetric: prometheus.Gauge<string>
  public throughputMetric: prometheus.Counter<string>

  constructor(protected config: any) {
    /**
     * Total time each HTTP request takes.
     */
    this.httpMetric = new prometheus.Histogram(config.httpMetric)

    /**
     * Uptime performance of the application.
     */
    this.uptimeMetric = new prometheus.Gauge(config.uptimeMetric)

    /**
     * No. of request handled.
     */
    this.throughputMetric = new prometheus.Counter(config.throughputMetric)
  }
}
