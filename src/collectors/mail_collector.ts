/// <reference types="@adonisjs/mail/mail_provider" />

import type { Counter } from 'prom-client'
import { configProvider } from '@adonisjs/core'
import type { EmitterService } from '@adonisjs/core/types'

import { Collector } from './collector.js'
import { mergeCommonAndCollectorOptions } from '../utils.js'
import type { CommonCollectorOptions, ResolvedPromConfig } from '../types.js'

export function mailCollector() {
  return configProvider.create(async (app) => {
    const emitter = await app.container.make('emitter')
    const config = app.config.get<ResolvedPromConfig>('prometheus')

    return new MailCollector(emitter, mergeCommonAndCollectorOptions(config, {}))
  })
}

export class MailCollector extends Collector {
  #mailSentCounter: Counter<'status'> | undefined

  constructor(
    private emitter: EmitterService,
    options: CommonCollectorOptions,
  ) {
    super(options)
  }

  async register() {
    this.#mailSentCounter = this.createCounter({
      name: 'mail_sent_total',
      help: 'Total number of mails sent',
      labelNames: ['status'],
    })

    this.emitter.on('mail:sent', () => this.#mailSentCounter?.inc({ status: 'success' }))
    this.emitter.on('queued:mail:error', () => this.#mailSentCounter?.inc({ status: 'error' }))
  }
}
