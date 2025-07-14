import { test } from '@japa/runner'
import { Registry } from 'prom-client'
import { IgnitorFactory } from '@adonisjs/core/factories'
import { EmitterFactory } from '@adonisjs/core/factories/events'

import { CacheCollector } from '../src/collectors/cache_collector.js'

test.group('CacheCollector', () => {
  test('monitor cache hits', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new CacheCollector(emitter as any, { metricsPrefix: 'adonis', registry: register }).register()

    await emitter.emit('cache:hit', {
      key: 'users:123',
      store: 'redis',
      value: { id: 123, name: 'John' },
    })

    const metrics = await register.getSingleMetricAsString('adonis_cache_hits_total')
    assert.include(metrics, 'adonis_cache_hits_total{store="redis",key="users:123"} 1')
  })

  test('monitor cache misses', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new CacheCollector(emitter as any, { metricsPrefix: 'adonis', registry: register }).register()

    await emitter.emit('cache:miss', {
      key: 'posts:456',
      store: 'memory',
    })

    const metrics = await register.getSingleMetricAsString('adonis_cache_misses_total')
    assert.include(metrics, 'adonis_cache_misses_total{store="memory",key="posts:456"} 1')
  })

  test('monitor cache writes', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new CacheCollector(emitter as any, { metricsPrefix: 'adonis', registry: register }).register()

    await emitter.emit('cache:written', {
      key: 'sessions:abc123',
      store: 'redis',
      value: { userId: 1, data: {} },
    })

    const metrics = await register.getSingleMetricAsString('adonis_cache_writes_total')
    assert.include(metrics, 'adonis_cache_writes_total{store="redis",key="sessions:abc123"} 1')
  })

  test('group keys using keyGroups option with string replacement', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new CacheCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      keyGroups: [
        [/^users:(\d+)$/, 'users:*'],
        [/^posts:(\d+)$/, 'posts:*'],
      ],
    }).register()

    await emitter.emit('cache:hit', {
      key: 'users:123',
      store: 'redis',
      value: { id: 123 },
    })

    await emitter.emit('cache:hit', {
      key: 'users:456',
      store: 'redis',
      value: { id: 456 },
    })

    await emitter.emit('cache:miss', {
      key: 'posts:789',
      store: 'redis',
    })

    const hitsMetrics = await register.getSingleMetricAsString('adonis_cache_hits_total')
    const missesMetrics = await register.getSingleMetricAsString('adonis_cache_misses_total')

    assert.include(hitsMetrics, 'adonis_cache_hits_total{store="redis",key="users:*"} 2')

    assert.include(missesMetrics, 'adonis_cache_misses_total{store="redis",key="posts:*"} 1')
  })

  test('group keys using keyGroups option with function replacement', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new CacheCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      keyGroups: [
        [/^sessions:([\w-]+)$/, (match) => `sessions:${match[1].length > 10 ? 'long' : 'short'}`],
      ],
    }).register()

    await emitter.emit('cache:hit', {
      key: 'sessions:abc123',
      store: 'redis',
      value: {},
    })

    await emitter.emit('cache:hit', {
      key: 'sessions:very-long-session-id-12345',
      store: 'redis',
      value: {},
    })

    const metrics = await register.getSingleMetricAsString('adonis_cache_hits_total')

    assert.include(metrics, 'adonis_cache_hits_total{store="redis",key="sessions:short"} 1')

    assert.include(metrics, 'adonis_cache_hits_total{store="redis",key="sessions:long"} 1')
  })

  test('use original key when no keyGroups match', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new CacheCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      keyGroups: [[/^users:(\d+)$/, 'users:*']],
    }).register()

    await emitter.emit('cache:hit', {
      key: 'some:other:key',
      store: 'memory',
      value: {},
    })

    const metrics = await register.getSingleMetricAsString('adonis_cache_hits_total')

    assert.include(metrics, 'adonis_cache_hits_total{store="memory",key="some:other:key"} 1')
  })

  test('handle multiple patterns with first match wins', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    new CacheCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      keyGroups: [
        [/^users:(\d+)$/, 'users:*'],
        [/^users:.*$/, 'users:all'],
      ],
    }).register()

    await emitter.emit('cache:hit', {
      key: 'users:123',
      store: 'redis',
      value: { id: 123 },
    })

    const metrics = await register.getSingleMetricAsString('adonis_cache_hits_total')

    assert.include(metrics, 'adonis_cache_hits_total{store="redis",key="users:*"} 1')

    assert.notInclude(metrics, 'adonis_cache_hits_total{store="redis",key="users:all"} 1')
  })
})
