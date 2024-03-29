import { test } from '@japa/runner'
import { setupAppServer } from '../tests-helpers/setup'

test.group('Prometheus', () => {
  test('Expose endpoint', async ({ client }) => {
    const { cleanup } = await setupAppServer()

    const response = await client.get('/metrics')
    response.assertStatus(200)

    await cleanup()
  })

  test('Expose endpoint with system metrics', async ({ assert, client }) => {
    const { cleanup } = await setupAppServer()

    const response = await client.get('/metrics')
    assert.include(response.text(), 'process_cpu_user_seconds_total')

    await cleanup()
  })

  test('Should have uptrime metrics', async ({ assert, client }) => {
    const { cleanup } = await setupAppServer()

    const response = await client.get('/metrics')
    assert.include(response.text(), 'uptime_metrics_test')

    await cleanup()
  })

  test('Should expose on custom endpoint if defined', async ({ client }) => {
    const { cleanup } = await setupAppServer({
      promConfig: {
        endpoint: '/custom-metrics',
      },
    })

    const response = await client.get('/custom-metrics')
    response.assertStatus(200)

    await cleanup()
  })

  test('Should not increment throughput when route is excluded', async ({ assert, client }) => {
    const { cleanup } = await setupAppServer()

    const response = await client.get('/metrics')
    assert.include(response.text(), 'adonis_throughput_metrics 0')

    await cleanup()
  })

  test('Should increment throughput when route is not excluded', async ({ assert, client }) => {
    const { application, cleanup } = await setupAppServer()

    const Router = application.container.use('Adonis/Core/Route')
    Router.get('/test', () => 'test')
    Router.commit()

    await client.get('/test')

    const response = await client.get('/metrics')
    assert.include(response.text(), 'adonis_throughput_metrics 1')

    await cleanup()
  })

  test('Should group same status code when enabled', async ({ assert, client }) => {
    const { application, cleanup } = await setupAppServer()

    const Router = application.container.use('Adonis/Core/Route')
    Router.get('/test', ({ response, request }) => response.status(request.qs().status))
    Router.commit()

    await client.get('/test?status=400')
    await client.get('/test?status=410')
    await client.get('/test?status=499')

    const response = await client.get('/metrics')
    assert.include(
      response.text(),
      'adonis_http_request_durations_count{method="GET",url="/test",statusCode="4xx"} 3'
    )

    await cleanup()
  })
})
