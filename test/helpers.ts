import { defu } from 'defu'
import { createServer } from 'node:http'
import { IgnitorFactory } from '@adonisjs/core/factories'
import type { ApplicationService } from '@adonisjs/core/types'

import { defineConfig } from '../index.js'
import type { PrometheusConfig } from '../src/types.js'

export const BASE_URL = new URL('../test/__app/', import.meta.url)

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

export const DEFAULT_PROMETHEUS_CONFIG = defineConfig({
  endpoint: '/metrics',

  systemMetrics: {
    enabled: true,
    prefix: '',
  },

  uptimeMetric: {
    enabled: true,
    name: 'uptime_metrics',
    help: 'Uptime performance of the application (1 = up, 0 = down)',
    prefix: '',
  },

  throughputMetric: {
    enabled: true,
    name: 'adonis_throughput_metrics',
    help: 'No. of request handled.',
    prefix: '',
  },

  httpMetric: {
    enabled: true,
    name: 'adonis_http_request_durations',
    includeQueryParams: false,
    includeRouteParams: false,
    shouldGroupStatusCode: true,
    help: 'Total time each HTTP request takes.',
    labelNames: ['method', 'url', 'statusCode'],
    buckets: [0.003, 0.03, 0.1, 0.3, 1.5, 10],
    prefix: '',
    excludedRoutes: ['/metrics', '/health'],
  },
})

export async function setupApp(
  options: {
    promConfig?: DeepPartial<PrometheusConfig>
    preSetup?: (app: ApplicationService) => Promise<any>
  } = {},
) {
  const ignitor = new IgnitorFactory()
    .merge({
      config: { prometheus: defu(options.promConfig, DEFAULT_PROMETHEUS_CONFIG) },
      rcFileContents: { providers: [() => import('../providers/prometheus_provider.js')] },
    })
    .withCoreProviders()
    .withCoreConfig()
    .create(BASE_URL, {
      importer: (filePath) => {
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
          return import(new URL(filePath, BASE_URL).href)
        }

        return import(filePath)
      },
    })

  const app = ignitor.createApp('web')
  await app.init()
  await app.boot()

  const router = await app.container.make('router')
  router.use([() => import('../src/collect_metrics_middleware.js')])

  let httpServer: ReturnType<typeof createServer>
  app.ready(async () => {
    const server = await app.container.make('server')
    await server.boot()

    httpServer = createServer(server.handle.bind(server))
    httpServer.listen(3333)
  })

  app.terminating(async () => {
    httpServer.close()
  })

  await options.preSetup?.(app)
  await app.start(() => {})

  return {
    app,
    ignitor,
    cleanup: () => {
      app.terminate()
    },
  }
}
