/// <reference types="@adonisjs/cache/cache_provider" />

import type { Counter } from 'prom-client'
import { configProvider } from '@adonisjs/core'
import type { EmitterService } from '@adonisjs/core/types'

import { Collector } from './collector.js'
import { mergeCommonAndCollectorOptions } from '../utils.js'
import type { CommonCollectorOptions, ResolvedPromConfig } from '../types.js'

export function cacheCollector() {
  return configProvider.create(async (app) => {
    const config = app.config.get<ResolvedPromConfig>('prometheus')
    const emitter = await app.container.make('emitter')

    return new CacheCollector(emitter, mergeCommonAndCollectorOptions(config, {}))
  })
}

export class CacheCollector extends Collector {
  private cacheHitsCounter?: Counter<'store' | 'key'>
  private cacheMissesCounter?: Counter<'store' | 'key'>
  private cacheWritesCounter?: Counter<'store' | 'key'>

  constructor(
    private emitter: EmitterService,
    options: CommonCollectorOptions,
  ) {
    super(options)
  }

  #onCacheHit(payload: { key: string; store: string; value: any }) {
    this.cacheHitsCounter?.inc({ store: payload.store, key: payload.key })
  }

  #onCacheMiss(payload: { key: string; store: string }) {
    this.cacheMissesCounter?.inc({ store: payload.store, key: payload.key })
  }

  #onCacheWritten(payload: { key: string; store: string; value: any }) {
    this.cacheWritesCounter?.inc({ store: payload.store, key: payload.key })
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
