import * as prometheus from 'prom-client'
import config from '@adonisjs/core/services/config'
import type { HttpContext } from '@adonisjs/core/http'

import { IpWhitelist } from '../ip_whitelist.js'
import type { ResolvedPromConfig } from '../types.js'

export class PrometheusMetricController {
  #config: ResolvedPromConfig
  #ipWhitelist: IpWhitelist

  constructor() {
    this.#config = config.get<ResolvedPromConfig>('prometheus')
    this.#ipWhitelist = new IpWhitelist(this.#config.ipsWhitelist)
  }

  async handle({ request, response }: HttpContext) {
    /**
     * Ensure the request is coming from a whitelisted IP address.
     */
    if (!this.#ipWhitelist.isAllowed(request.ip())) {
      return response.unauthorized('Unauthorized')
    }

    const metrics = await prometheus.register.metrics()
    return response.header('Content-type', prometheus.register.contentType).ok(metrics)
  }
}
