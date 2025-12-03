/// <reference types="@adonisjs/lucid/database_provider" />

import type { Histogram } from 'prom-client'
import { configProvider } from '@adonisjs/core'
import type { EmitterService } from '@adonisjs/core/types'
import type { DbQueryEventNode } from '@adonisjs/lucid/types/database'

import { Collector } from './collector.js'
import { mergeCommonAndCollectorOptions } from '../utils.js'
import type { CommonCollectorOptions, LucidCollectorOptions, ResolvedPromConfig } from '../types.js'

export function lucidCollector(options?: LucidCollectorOptions) {
  return configProvider.create(async (app) => {
    const config = app.config.get<ResolvedPromConfig>('prometheus')
    const emitter = await app.container.make('emitter')

    return new LucidCollector(emitter, mergeCommonAndCollectorOptions(config, options || {}))
  })
}

export class LucidCollector extends Collector {
  #dbQueryDurationHistogram: Histogram<string> | undefined

  constructor(
    private emitter: EmitterService,
    private options: LucidCollectorOptions & CommonCollectorOptions,
  ) {
    super(options)
  }

  #nanosecondsToSeconds(nanoseconds: number): number {
    return nanoseconds / 1_000_000_000
  }

  #onDbQuery(event: DbQueryEventNode) {
    if (!event.duration) return

    const labels = {
      connection: event.connection,
      model: event.model || 'unknown',
      method: event.method,
    }

    const exemplarLabels = this.getExemplarLabels()

    if (this.exemplarsEnabled) {
      // Type assertion needed due to prom-client type bug
      // See: https://github.com/siimon/prom-client/issues/653
      this.#dbQueryDurationHistogram?.observe({
        labels,
        value: this.#nanosecondsToSeconds(event.duration![1]),
        exemplarLabels,
      } as any)
    } else {
      this.#dbQueryDurationHistogram?.observe(
        labels,
        this.#nanosecondsToSeconds(event.duration![1]),
      )
    }
  }

  async register() {
    this.#dbQueryDurationHistogram = this.createHistogram({
      name: 'lucid_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['connection', 'model', 'method'],
      buckets: this.options.queryDuration?.buckets || [
        0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60,
      ],
    })

    this.emitter.on('db:query', (payload) => this.#onDbQuery(payload))
  }
}
