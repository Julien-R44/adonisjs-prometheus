/// <reference types="@adonisjs/cache/cache_provider" />

import type { Counter } from 'prom-client'
import { configProvider } from '@adonisjs/core'
import type { EmitterService } from '@adonisjs/core/types'

import { Collector } from './collector.js'
import { mergeCommonAndCollectorOptions } from '../utils.js'
import type { CommonCollectorOptions, ResolvedPromConfig } from '../types.js'

export interface CacheCollectorOptions {
  /**
   * Key groups
   *
   * See https://bentocache.dev/docs/plugin-prometheus#keygroups
   */
  keyGroups?: Array<[RegExp, ((match: RegExpMatchArray) => string) | string]>
}

export function cacheCollector(options: CacheCollectorOptions = {}) {
  return configProvider.create(async (app) => {
    const config = app.config.get<ResolvedPromConfig>('prometheus')
    const emitter = await app.container.make('emitter')

    return new CacheCollector(emitter, mergeCommonAndCollectorOptions(config, options))
  })
}

export class CacheCollector extends Collector {
  private cacheHitsCounter?: Counter<'store' | 'key'>
  private cacheMissesCounter?: Counter<'store' | 'key'>
  private cacheWritesCounter?: Counter<'store' | 'key'>

  constructor(
    private emitter: EmitterService,
    private options: CommonCollectorOptions & CacheCollectorOptions,
  ) {
    super(options)
  }

  /**
   * Get the key label that will be used for the metrics
   * based on the keyGroups defined in the options
   */
  #getKeyLabel(key: string): string {
    for (const [regex, group] of this.options.keyGroups ?? []) {
      if (!regex.test(key)) continue

      if (typeof group === 'string') return group
      return group(regex.exec(key)!)
    }

    return key
  }

  #incrementCounter(
    counter: Counter<'store' | 'key'> | undefined,
    payload: { key: string; store: string },
  ) {
    const key = this.#getKeyLabel(payload.key)
    const labels = { store: payload.store, key }
    const exemplarLabels = this.getExemplarLabels()

    if (this.exemplarsEnabled) {
      // Type assertion needed due to prom-client type bug
      // See: https://github.com/siimon/prom-client/issues/653
      counter?.inc({ labels, exemplarLabels, value: 1 } as any)
    } else {
      counter?.inc(labels)
    }
  }

  #onCacheHit(payload: { key: string; store: string; value: any }) {
    this.#incrementCounter(this.cacheHitsCounter, payload)
  }

  #onCacheMiss(payload: { key: string; store: string }) {
    this.#incrementCounter(this.cacheMissesCounter, payload)
  }

  #onCacheWritten(payload: { key: string; store: string; value: any }) {
    this.#incrementCounter(this.cacheWritesCounter, payload)
  }

  async register() {
    this.cacheHitsCounter = this.createCounter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['store', 'key'],
    })

    this.cacheMissesCounter = this.createCounter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['store', 'key'],
    })

    this.cacheWritesCounter = this.createCounter({
      name: 'cache_writes_total',
      help: 'Total number of cache writes',
      labelNames: ['store', 'key'],
    })

    this.emitter.on('cache:hit', (payload) => this.#onCacheHit(payload))
    this.emitter.on('cache:miss', (payload) => this.#onCacheMiss(payload))
    this.emitter.on('cache:written', (payload) => this.#onCacheWritten(payload))
  }
}
