import { configProvider } from '@adonisjs/core'
import { collectDefaultMetrics } from 'prom-client'

import { Collector } from './collector.js'
import { mergeCommonAndCollectorOptions } from '../utils.js'
import type {
  CommonCollectorOptions,
  ResolvedPromConfig,
  SystemCollectorOptions,
} from '../types.js'

export function systemCollector(options?: SystemCollectorOptions) {
  return configProvider.create(async (app) => {
    const config = app.config.get<ResolvedPromConfig>('prometheus', {})
    return new SystemCollector(mergeCommonAndCollectorOptions(config, options || {}))
  })
}

export class SystemCollector extends Collector {
  constructor(private options: SystemCollectorOptions & CommonCollectorOptions) {
    super(options)
  }

  async register() {
    collectDefaultMetrics({
      ...this.options,
      register: this.options.registry,
      prefix: this.options.metricsPrefix,
      /**
       * When exemplars are enabled, prom-client's default metrics
       * will automatically populate traceId/spanId from OpenTelemetry.
       *
       * Note: The TypeScript types don't include enableExemplars but
       * the implementation supports it for metrics like processCpuTotal.
       */
      enableExemplars: this.options.enableExemplars,
    } as Parameters<typeof collectDefaultMetrics>[0])
  }
}
