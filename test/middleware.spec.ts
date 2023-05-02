import { test } from '@japa/runner'
import { setupApp } from '../test_helpers/setup.js'

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
    const { app, cleanup } = await setupApp()

    const router = await app.container.make('router')

    router.get('/test', () => 'test')
    router.commit()

    await client.get('/test')
    // Calling /test doesnt trigger the middleware collect_metrics_middleware

    const response = await client.get('/metrics')
    // However, the /metrics endpoint does trigger the middleware.
    // The /metrics endpoint is registered via a provider started during
    // the initial boot of the application

    assert.include(response.text(), 'adonis_throughput_metrics 2')
    cleanup()
  }).pin()
})
