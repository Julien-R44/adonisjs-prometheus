import { configProvider } from '@adonisjs/core'
import type { Counter, Histogram } from 'prom-client'
import type { HttpContext } from '@adonisjs/core/http'
import type { EmitterService } from '@adonisjs/core/types'
import type { HttpRequestFinishedPayload } from '@adonisjs/core/types/http'

import { Collector } from './collector.js'
import { mergeCommonAndCollectorOptions } from '../utils.js'
import type { CommonCollectorOptions, HttpCollectorOptions, ResolvedPromConfig } from '../types.js'

export function httpCollector(options?: HttpCollectorOptions) {
  return configProvider.create(async (app) => {
    const emitter = await app.container.make('emitter')
    const config = app.config.get<ResolvedPromConfig>('prometheus', {})

    return new HttpCollector(emitter, mergeCommonAndCollectorOptions(config, options || {}))
  })
}

export class HttpCollector extends Collector {
  /**
   * Total time each HTTP request takes.
   */
  httpRequestDurationHistogram: Histogram<string> | undefined

  /**
   * No. of request handled.
   */
  httpRequestCounter: Counter<string> | undefined

  constructor(
    private emitter: EmitterService,
    private options: HttpCollectorOptions & CommonCollectorOptions,
  ) {
    super(options)
  }

  #nanosecondsToSeconds(nanoseconds: number) {
    return nanoseconds / 1_000_000_000
  }

  /**
   * Check if the response is OK. Status codes < 400 are considered OK.
   */
  #isResponseOk(response: HttpContext['response']) {
    return response.response.statusCode < 400
  }

  /**
   * Check if the current route is excluded by the user configuration.
   */
  #isExcludedRoute(ctx: HttpContext) {
    const excludedRoutes = this.options.excludedRoutes || []

    if (typeof excludedRoutes === 'function') {
      return excludedRoutes(ctx)
    }

    return excludedRoutes.includes(ctx.route!.pattern)
  }

  /**
   * Create the status code for the metric. May group status codes (2xx, 3xx...) if
   * the user has configured it.
   */
  #createStatusCode(ctx: HttpContext) {
    return this.options.shouldGroupStatusCode
      ? `${ctx.response.response.statusCode.toString()[0]}xx`
      : ctx.response.response.statusCode.toString()
  }

  /**
   * Called when an HTTP request is completed.
   */
  #onHttpRequestCompleted(event: HttpRequestFinishedPayload) {
    console.log('event', event)
    if (this.#isExcludedRoute(event.ctx)) return

    const status = this.#createStatusCode(event.ctx)
    const payload = {
      status,
      method: event.ctx.request.method(),
      ok: this.#isResponseOk(event.ctx.response) ? 'true' : 'false',
      route: event.ctx.route!.pattern,
    }

    this.httpRequestCounter?.inc(payload)
    this.httpRequestDurationHistogram?.observe(
      payload,
      this.#nanosecondsToSeconds(event.duration[1]),
    )
  }

  /**
   * Register the HTTP metrics.
   */
  async register() {
    this.httpRequestCounter = this.createCounter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'status', 'ok', 'route'],
    })

    this.httpRequestDurationHistogram = this.createHistogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'ok', 'status'],
      buckets: this.options.requestDuration?.buckets || [
        0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10,
      ],
    })

    this.emitter.on('http:request_completed', (event) => this.#onHttpRequestCompleted(event))
  }
}
