import { test } from '@japa/runner'
import { Registry } from 'prom-client'
import { IgnitorFactory } from '@adonisjs/core/factories'
import { EmitterFactory } from '@adonisjs/core/factories/events'

import { secondsToNanoSeconds } from './helpers.js'
import { HttpCollector } from '../src/collectors/http_collector.js'

function createMockHttpContext(options: { method?: string; statusCode?: number; route?: string }) {
  return {
    request: { method: () => options.method || 'GET' },
    response: { response: { statusCode: options.statusCode || 200 } },
    route: options.route ? { pattern: options.route } : undefined,
  }
}

function createHttpRequestEvent(options: {
  method?: string
  statusCode?: number
  route?: string
  durationSeconds?: number
}) {
  return {
    ctx: createMockHttpContext(options),
    duration: [0, secondsToNanoSeconds(options.durationSeconds || 0.1)] as [number, number],
  }
}

test.group('HttpCollector', () => {
  test('monitor HTTP requests', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
    })
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
        durationSeconds: 0.05,
      }),
    )

    const counterMetrics = await register.getSingleMetricAsString('adonis_http_requests_total')
    assert.include(counterMetrics, 'method="GET"')
    assert.include(counterMetrics, 'status="200"')
    assert.include(counterMetrics, 'ok="true"')
    assert.include(counterMetrics, 'route="/users"')
    assert.match(counterMetrics, /adonis_http_requests_total{[^}]+} 1/)

    const histogramMetrics = await register.getSingleMetricAsString(
      'adonis_http_request_duration_seconds',
    )
    assert.include(histogramMetrics, 'le="0.05"')
    assert.include(histogramMetrics, 'method="GET"')
    assert.include(histogramMetrics, 'route="/users"')
    assert.match(histogramMetrics, /adonis_http_request_duration_seconds_bucket{[^}]+} 1/)
  })

  test('track multiple requests', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
    })
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'POST',
        statusCode: 201,
        route: '/users',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
      }),
    )

    const metrics = await register.getSingleMetricAsString('adonis_http_requests_total')
    assert.include(metrics, 'method="GET"')
    assert.include(metrics, 'status="200"')
    assert.include(metrics, 'route="/users"')
    assert.match(metrics, /adonis_http_requests_total{[^}]+} 2/)
    assert.include(metrics, 'method="POST"')
    assert.include(metrics, 'status="201"')
  })

  test('mark requests with status >= 400 as not ok', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
    })
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 404,
        route: '/users/:id',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'POST',
        statusCode: 500,
        route: '/users',
      }),
    )

    const metrics = await register.getSingleMetricAsString('adonis_http_requests_total')
    assert.include(metrics, 'ok="false"')
    assert.include(metrics, 'status="404"')
    assert.include(metrics, 'status="500"')
  })

  test('group status codes when shouldGroupStatusCode is enabled', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
      shouldGroupStatusCode: true,
    })
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 201,
        route: '/users',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 404,
        route: '/users',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 500,
        route: '/users',
      }),
    )

    const metrics = await register.getSingleMetricAsString('adonis_http_requests_total')
    assert.include(metrics, 'status="2xx"')
    assert.include(metrics, 'status="4xx"')
    assert.include(metrics, 'status="5xx"')
    assert.notInclude(metrics, 'status="200"')
    assert.notInclude(metrics, 'status="201"')
  })

  test('exclude routes from metrics using string array', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
      excludedRoutes: ['/health', '/metrics'],
    })
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/health',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/metrics',
      }),
    )

    const metrics = await register.getSingleMetricAsString('adonis_http_requests_total')
    assert.include(metrics, 'route="/users"')
    assert.notInclude(metrics, 'route="/health"')
    assert.notInclude(metrics, 'route="/metrics"')
  })

  test('exclude routes from metrics using function', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
      excludedRoutes: (ctx) => ctx.route?.pattern.startsWith('/internal') || false,
    })
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/internal/health',
      }),
    )

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/internal/metrics',
      }),
    )

    const metrics = await register.getSingleMetricAsString('adonis_http_requests_total')
    assert.include(metrics, 'route="/users"')
    assert.notInclude(metrics, 'route="/internal/health"')
    assert.notInclude(metrics, 'route="/internal/metrics"')
  })

  test('ignore requests without a route', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
    })
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
      }),
    )

    // Request without route (e.g., 404 for non-existent path)
    await emitter.emit('http:request_completed', {
      ctx: createMockHttpContext({ method: 'GET', statusCode: 404 }),
      duration: [0, secondsToNanoSeconds(0.1)],
    })

    const metrics = await register.getSingleMetricAsString('adonis_http_requests_total')
    assert.include(metrics, 'route="/users"')
    // Should only have one metric (the one with a route)
    assert.equal((metrics.match(/adonis_http_requests_total{/g) || []).length, 1)
  })

  test('use custom histogram buckets', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const customBuckets = [0.1, 0.5, 1, 5, 10]
    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
      requestDuration: { buckets: customBuckets },
    })
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
        durationSeconds: 0.3,
      }),
    )

    const metrics = await register.getSingleMetricAsString('adonis_http_request_duration_seconds')
    // Check that custom buckets are used
    assert.include(metrics, 'le="0.1"')
    assert.include(metrics, 'le="0.5"')
    assert.include(metrics, 'le="1"')
    assert.include(metrics, 'le="5"')
    assert.include(metrics, 'le="10"')
    // Default buckets should not be present
    assert.notInclude(metrics, 'le="0.005"')
    assert.notInclude(metrics, 'le="0.025"')
  })

  test('record correct duration in histogram', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: false,
    })
    collector.register()

    // Request that takes 0.03 seconds (should be in 0.05 bucket but not 0.025)
    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
        durationSeconds: 0.03,
      }),
    )

    const metrics = await register.getSingleMetricAsString('adonis_http_request_duration_seconds')
    // Should be counted in buckets >= 0.05
    assert.include(metrics, 'le="0.05"')
    assert.match(metrics, /le="0.05"[^}]*} 1/)
    // Should NOT be counted in bucket 0.025
    assert.match(metrics, /le="0.025"[^}]*} 0/)
  })

  test('create metrics with enableExemplars flag when enabled', async ({ assert, fs }) => {
    const app = new IgnitorFactory().create(fs.baseUrl)
    const emitter = new EmitterFactory().create(app.getApp()!)
    const register = new Registry()
    register.setContentType(Registry.OPENMETRICS_CONTENT_TYPE as any)

    const collector = new HttpCollector(emitter as any, {
      metricsPrefix: 'adonis',
      registry: register,
      enableExemplars: true,
    })
    await collector.init()
    collector.register()

    await emitter.emit(
      'http:request_completed',
      createHttpRequestEvent({
        method: 'GET',
        statusCode: 200,
        route: '/users',
        durationSeconds: 0.05,
      }),
    )

    // Metrics should still be recorded correctly even with exemplars enabled
    // Note: OpenMetrics format adds _total suffix to counter names
    const counterMetrics = await register.getSingleMetricAsString('adonis_http_requests_total')
    assert.include(counterMetrics, 'method="GET"')
    assert.include(counterMetrics, 'status="200"')
    assert.match(counterMetrics, /adonis_http_requests_total[_alot]*{[^}]+} 1/)

    const histogramMetrics = await register.getSingleMetricAsString(
      'adonis_http_request_duration_seconds',
    )
    assert.include(histogramMetrics, 'le="0.05"')
    assert.include(histogramMetrics, 'method="GET"')
  })
})
