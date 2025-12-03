import { Counter, Gauge, Histogram } from 'prom-client'
import type { CounterConfiguration, GaugeConfiguration, HistogramConfiguration } from 'prom-client'

import type { CommonCollectorOptions, ExemplarLabels } from '../types.js'
import { getExemplarLabelsFromOtel, tryLoadOpenTelemetry } from '../utils.js'

export abstract class Collector {
  #otelApi: typeof import('@opentelemetry/api') | undefined

  constructor(private commonOptions: CommonCollectorOptions) {}

  /**
   * Initialize the collector. Will be called before `register()`.
   * Load OpenTelemetry API if exemplars are enabled.
   */
  async init(): Promise<void> {
    if (this.commonOptions.enableExemplars) {
      this.#otelApi = await tryLoadOpenTelemetry()
    }
  }

  /**
   * Get exemplar labels from OpenTelemetry context.
   * Returns undefined if exemplars are not enabled or OTel is not available.
   */
  protected getExemplarLabels(): ExemplarLabels | undefined {
    if (!this.#otelApi) return undefined
    return getExemplarLabelsFromOtel(this.#otelApi)
  }

  /**
   * Check if exemplars are enabled
   */
  protected get exemplarsEnabled(): boolean {
    return this.commonOptions.enableExemplars && this.#otelApi !== undefined
  }

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
      enableExemplars: configuration.enableExemplars || this.commonOptions.enableExemplars,
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
      enableExemplars: configuration.enableExemplars || this.commonOptions.enableExemplars,
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
      enableExemplars: configuration.enableExemplars || this.commonOptions.enableExemplars,
    })
  }

  /**
   * Register collectors
   */
  abstract register(): void
}
