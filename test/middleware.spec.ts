import { test } from '@japa/runner'
import { Counter } from 'prom-client'

import { setupApp } from './helpers.js'

test.group('Collect Metrics middleware', () => {
  test('Expose endpoint', async ({ client }) => {
    const { cleanup } = await setupApp()
    const response = await client.get('/metrics')
    response.assertStatus(200)

    cleanup()
  })

  test('Should expose on custom endpoint if defined', async ({ client }) => {
    const { cleanup } = await setupApp({ promConfig: { endpoint: '/custom-metrics' } })

    const response = await client.get('/custom-metrics')
    response.assertStatus(200)

    cleanup()
  })

  test('Should have uptrime metrics', async ({ assert, client }) => {
    const { cleanup } = await setupApp()

    const response = await client.get('/metrics')
    assert.include(response.text(), 'uptime_metrics')

    cleanup()
  })

  test('Should expose endpoint with system metrics', async ({ assert, client }) => {
    const { cleanup } = await setupApp()

    const response = await client.get('/metrics')
    assert.include(response.text(), 'process_cpu_user_seconds_total')

    cleanup()
  })

  test('should not expose system metrics if specified', async ({ assert, client }) => {
    const { cleanup } = await setupApp({ promConfig: { systemMetrics: { enabled: false } } })

    const response = await client.get('/metrics')
    assert.notInclude(response.text(), 'process_cpu_user_seconds_total')

    cleanup()
  })

  test('should not increment throughput when route is excluded', async ({ assert, client }) => {
    const { cleanup } = await setupApp()

    const response = await client.get('/metrics')
    assert.include(response.text(), 'adonis_throughput_metrics 0')

    cleanup()
  })

  test('should increment throughput when route is not excluded', async ({ assert, client }) => {
    const { cleanup } = await setupApp({
      preSetup: async (app) => {
        const router = await app.container.make('router')
        router.get('/test', () => 'test')
      },
    })

    await client.get('/test')
    await client.get('/test')

    const response = await client.get('/metrics')
    assert.include(response.text(), 'adonis_throughput_metrics 2')

    cleanup()
  })

  test('Should group same status code when enabled', async ({ assert, client }) => {
    const { cleanup } = await setupApp({
      preSetup: async (app) => {
        const router = await app.container.make('router')

        router.get('/test', ({ request, response }) => response.status(request.qs().status))
      },
    })

    await client.get('/test?status=200')
    await client.get('/test?status=201')
    await client.get('/test?status=410')
    await client.get('/test?status=414')
    await client.get('/test?status=499')

    const response = await client.get('/metrics')

    assert.include(
      response.text(),
      'adonis_http_request_durations_count{method="GET",url="/test",statusCode="4xx"} 3',
    )

    assert.include(
      response.text(),
      'adonis_http_request_durations_count{method="GET",url="/test",statusCode="2xx"} 2',
    )

    cleanup()
  })

  test('should not expose throughput metrics if specified', async ({ assert, client }) => {
    const { cleanup } = await setupApp({
      promConfig: {
        throughputMetric: { enabled: false },
      },
    })

    const response = await client.get('/metrics')
    assert.notInclude(response.text(), 'adonis_throughput_metrics')

    cleanup()
  })

  test('should not expose uptime metrics if specified', async ({ assert, client }) => {
    const { cleanup } = await setupApp({
      promConfig: {
        uptimeMetric: { enabled: false },
      },
    })

    const response = await client.get('/metrics')
    assert.notInclude(response.text(), 'uptime_metrics')

    cleanup()
  })

  test('should include query params if specified', async ({ assert, client }) => {
    const { cleanup } = await setupApp({
      promConfig: {
        httpMetric: {
          includeQueryParams: true,
        },
      },
      preSetup: async (app) => {
        const router = await app.container.make('router')

        router.get('/test', ({ request, response }) => response.status(request.qs().status))
      },
    })

    await client.get('/test?status=200&foo=bar')
    await client.get('/test?status=201&foo=baz')

    const response = await client.get('/metrics')

    assert.include(
      response.text(),
      'adonis_http_request_durations_count{method="GET",url="/test?status=200&foo=bar",statusCode="2xx"} 1',
    )

    assert.include(
      response.text(),
      'adonis_http_request_durations_count{method="GET",url="/test?status=201&foo=baz",statusCode="2xx"} 1',
    )

    cleanup()
  })

  test('should not include query params if not specified', async ({ assert, client }) => {
    const { cleanup } = await setupApp({
      preSetup: async (app) => {
        const router = await app.container.make('router')

        router.get('/test', ({ request, response }) => response.status(request.qs().status))
      },
    })

    await client.get('/test?status=200&foo=bar')
    await client.get('/test?status=201&foo=baz')

    const response = await client.get('/metrics')

    assert.include(
      response.text(),
      'adonis_http_request_durations_count{method="GET",url="/test",statusCode="2xx"} 2',
    )

    cleanup()
  })

  test('should include custom metrics', async ({ assert, client }) => {
    const orderMetric = new Counter({
      name: 'sent_orders',
      help: 'Total Orders Sent',
    })

    const { cleanup } = await setupApp({
      preSetup: async (app) => {
        const router = await app.container.make('router')

        router.get('/test', ({ response }) => {
          orderMetric.inc()
          return response.status(200)
        })
      },
    })

    await client.get('/test')

    const response = await client.get('/metrics')
    assert.include(response.text(), 'sent_orders 1')

    cleanup()
  })
})
