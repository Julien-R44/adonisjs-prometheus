import { test } from '@japa/runner'
import { Counter, Registry } from 'prom-client'

import { defineConfig } from '../src/define_config.js'

test.group('Exemplars configuration', () => {
  test('enableExemplars defaults to false', async ({ assert }) => {
    const config = defineConfig({})

    assert.isFalse(config.enableExemplars)
  })

  test('enableExemplars can be set to true', async ({ assert }) => {
    const config = defineConfig({ enableExemplars: true })

    assert.isTrue(config.enableExemplars)
  })

  test('registry is set to OpenMetrics format when exemplars are enabled', async ({ assert }) => {
    const registry = new Registry()
    const config = defineConfig({
      registry,
      enableExemplars: true,
    })

    assert.equal(config.registry.contentType, Registry.OPENMETRICS_CONTENT_TYPE)
  })

  test('registry is not changed when exemplars are disabled', async ({ assert }) => {
    const registry = new Registry()
    const config = defineConfig({
      registry,
      enableExemplars: false,
    })

    assert.equal(config.registry.contentType, Registry.PROMETHEUS_CONTENT_TYPE)
  })

  test('default registry is set to OpenMetrics format when exemplars are enabled', async ({
    assert,
  }) => {
    // Use a fresh registry for this test to avoid polluting the global one
    const registry = new Registry()
    defineConfig({
      registry,
      enableExemplars: true,
    })

    assert.equal(registry.contentType, Registry.OPENMETRICS_CONTENT_TYPE)
  })

  test('custom counter without enableExemplars works with OpenMetrics registry', async ({
    assert,
  }) => {
    const registry = new Registry()
    defineConfig({
      registry,
      enableExemplars: true,
    })

    // Create a custom counter WITHOUT enableExemplars
    const customCounter = new Counter({
      name: 'custom_counter_total',
      help: 'A custom counter without exemplars',
      labelNames: ['action'],
      registers: [registry],
      // Note: enableExemplars is NOT set (defaults to false)
    })

    // Use the standard API (without exemplar object)
    customCounter.inc({ action: 'test' })
    customCounter.inc({ action: 'test' }, 5)

    const metrics = await registry.getSingleMetricAsString('custom_counter_total')

    // Should work and have the correct value
    assert.include(metrics, 'action="test"')
    assert.include(metrics, '6') // 1 + 5
  })

  test('custom counter with enableExemplars requires exemplar API on OpenMetrics registry', async ({
    assert,
  }) => {
    const registry = new Registry()
    defineConfig({
      registry,
      enableExemplars: true,
    })

    // Create a counter WITH enableExemplars
    const exemplarCounter = new Counter({
      name: 'exemplar_counter_total',
      help: 'A counter with exemplars',
      labelNames: ['action'],
      registers: [registry],
      enableExemplars: true,
    })

    // Must use the exemplar API (even without actual exemplar labels)
    exemplarCounter.inc({ labels: { action: 'test' }, value: 1 })
    exemplarCounter.inc({ labels: { action: 'test' }, value: 5 })

    const metrics = await registry.getSingleMetricAsString('exemplar_counter_total')

    assert.include(metrics, 'action="test"')
    assert.include(metrics, '6')
  })
})
