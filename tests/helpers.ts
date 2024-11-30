import { defu } from 'defu'
import { createServer } from 'node:http'
import { IgnitorFactory } from '@adonisjs/core/factories'
import type { ApplicationService } from '@adonisjs/core/types'

import { defineConfig } from '../index.js'
import type { PrometheusConfiguration } from '../src/types.js'

export const BASE_URL = new URL('../test/__app/', import.meta.url)

export const DEFAULT_PROMETHEUS_CONFIG = defineConfig({ endpoint: '/metrics' })

export async function setupApp(
  options: {
    promConfig?: PrometheusConfiguration
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

export function secondsToNanoSeconds(seconds: number) {
  return seconds * 1_000_000_000
}
