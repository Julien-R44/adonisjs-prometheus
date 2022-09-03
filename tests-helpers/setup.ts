import { join } from 'path'
import { createServer } from 'http'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/core/build/standalone'

export async function setupApp(options: { promConfig?: Record<string, unknown> } = {}) {
  const fs = new Filesystem(join(__dirname, '../test-app'))
  const app = new Application(fs.basePath, 'web', {
    providers: ['@adonisjs/core', '../providers/PrometheusProvider'],
  })

  await fs.add(
    'config/app.ts',
    `
    export const appKey = 'securepasswordpasswordpassword'
    export const http = {
      cookie: {},
      trustProxy: () => true,
    }
    `
  )

  const defaultPromConfig = {
    endpoint: '/metrics',

    systemMetrics: { enabled: true },

    uptimeMetric: {
      enabled: true,
      name: 'uptime_metrics_test',
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
  }

  await fs.add(
    'config/prometheus.ts',
    `export default ${JSON.stringify({
      ...defaultPromConfig,
      ...(options.promConfig || {}),
    })}`
  )

  await app.setup()
  await app.registerProviders()
  await app.bootProviders()

  return {
    fs,
    application: app,
    cleanup: async () => {
      await fs.cleanup()
      await app.shutdown()
    },
  }
}

export function setupServer(app: Application) {
  const server = app.container.use('Adonis/Core/Server')

  server.middleware.register([
    async () => {
      return {
        default: app.container.use('Adonis/Prometheus/Middlewares/CollectPerformanceMetrics'),
      }
    },
  ])
  server.optimize()

  const handler = server.handle.bind(server)
  server.instance = createServer(handler)

  server.instance?.listen(3333)

  return {
    server,
    cleanup: async () => {
      await new Promise((resolve) => server.instance?.close(resolve))
    },
  }
}

export async function setupAppServer(options: { promConfig?: Record<string, unknown> } = {}) {
  const { application, cleanup: cleanupApp, fs } = await setupApp(options)
  const { server, cleanup: cleanupServer } = setupServer(application)

  return {
    fs,
    server,
    application,
    cleanup: async () => {
      await cleanupApp()
      await cleanupServer()
    },
  }
}
