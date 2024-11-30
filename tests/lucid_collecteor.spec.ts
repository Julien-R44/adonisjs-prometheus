import { test } from '@japa/runner'
import { Registry } from 'prom-client'
import { IgnitorFactory } from '@adonisjs/core/factories'
import { EmitterFactory } from '@adonisjs/core/factories/events'

import { LucidCollector } from '../src/collectors/lucid_collector.js'

function secondsToNanoSeconds(seconds: number) {
  return seconds * 1_000_000_000
}

test.group('LucidCollector', (group) => {
  test('monitor queries', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new LucidCollector(emitter as any, { metricsPrefix: 'adonis', registry: register }).register()

    await emitter.emit('db:query', {
      connection: 'mysql',
      model: 'User',
      method: 'select',
      duration: [0, secondsToNanoSeconds(0.1)],
    })

    const metrics = await register.getSingleMetricAsString('adonis_lucid_query_duration_seconds')
    assert.include(
      metrics,
      'adonis_lucid_query_duration_seconds_bucket{le="0.1",connection="mysql",model="User",method="select"} 1',
    )
  })

  test('use unknown if no model is defined', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new LucidCollector(emitter as any, { metricsPrefix: 'adonis', registry: register }).register()

    await emitter.emit('db:query', {
      connection: 'mysql',
      method: 'select',
      duration: [0, secondsToNanoSeconds(0.1)],
    })

    const metrics = await register.getSingleMetricAsString('adonis_lucid_query_duration_seconds')
    assert.include(
      metrics,
      'adonis_lucid_query_duration_seconds_bucket{le="0.1",connection="mysql",model="unknown",method="select"} 1',
    )
  })
})
