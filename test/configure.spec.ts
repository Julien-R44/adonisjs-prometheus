import { test } from '@japa/runner'
import { IgnitorFactory } from '@adonisjs/core/factories'
import Configure from '@adonisjs/core/commands/configure'
import { BASE_URL } from '../test_helpers/setup.js'

test.group('Configure package', () => {
  test('create config file and add provider', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
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

    const ace = await app.container.make('ace')
    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    await assert.fileExists('config/prometheus.ts')
    await assert.fileExists('.adonisrc.json')
    await assert.fileContains('.adonisrc.json', '@julr/adonisjs-prometheus/prometheus_provider')
    await assert.fileContains('config/prometheus.ts', 'defineConfig')
  })
})
