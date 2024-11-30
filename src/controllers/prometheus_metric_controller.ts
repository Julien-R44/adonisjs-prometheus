import * as prometheus from 'prom-client'
import config from '@adonisjs/core/services/config'
import type { HttpContext } from '@adonisjs/core/http'

import type { ResolvedPromConfig } from '../types.js'

export class PrometheusMetricController {
  #config: ResolvedPromConfig

  constructor() {
    this.#config = config.get<ResolvedPromConfig>('prometheus')
  }

  async handle({ request, response }: HttpContext) {
    /**
     * Ensure the request is coming from a whitelisted IP address.
     */
    if (this.#config.ipsWhitelist.length && !this.#config.ipsWhitelist.includes(request.ip())) {
      return response.unauthorized('Unauthorized')
    }

    const metrics = await prometheus.register.metrics()
    return response.header('Content-type', prometheus.register.contentType).ok(metrics)
  }
}
