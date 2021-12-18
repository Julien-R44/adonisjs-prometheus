import Prometheus from '@ioc:Adonis/Prometheus'
import Config from '@ioc:Adonis/Core/Config'

export default {
  /**
   * Total time each HTTP request takes.
   */
  httpMetric: new Prometheus.Histogram(Config.get('prometheus.httpMetric')),

  /**
   * Uptime performance of the application.
   */
  uptimeMetric: new Prometheus.Gauge(Config.get('prometheus.uptimeMetric')),

  /**
   * No. of request handled.
   */
  throughputMetric: new Prometheus.Counter(Config.get('prometheus.throughputMetric')),
}
