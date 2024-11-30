import { Counter, Gauge, Histogram } from 'prom-client'
import type { CounterConfiguration, GaugeConfiguration, HistogramConfiguration } from 'prom-client'

import type { CommonCollectorOptions } from '../types.js'

export abstract class Collector {
  constructor(private commonOptions: CommonCollectorOptions) {}

  /**
   * Build metric name with an optional common prefix
   */
  buildMetricName(name: string): string {
    const prefix = this.commonOptions.metricsPrefix.endsWith('_')
      ? this.commonOptions.metricsPrefix.slice(0, -1)
      : this.commonOptions.metricsPrefix

    return [prefix, name].join('_')
  }

  /**
   * Create a counter metric
   */
  createCounter<T extends string = string>(configuration: CounterConfiguration<T>) {
    return new Counter({
      ...configuration,
      name: this.buildMetricName(configuration.name),
      registers: [this.commonOptions.registry],
    })
  }

  /**
   * Create a histogram metric
   */
  createHistogram<T extends string = string>(configuration: HistogramConfiguration<T>) {
    return new Histogram({
      ...configuration,
      name: this.buildMetricName(configuration.name),
      registers: [this.commonOptions.registry],
    })
  }

  /**
   * Create a gauge metric
   */
  createGauge<T extends string = string>(configuration: GaugeConfiguration<T>) {
    return new Gauge({
      ...configuration,
      name: this.buildMetricName(configuration.name),
      registers: [this.commonOptions.registry],
    })
  }

  /**
   * Register collectors
   */
  abstract register(): void
}
