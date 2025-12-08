<div align="center">
  <img src="https://i.imgur.com/ny3ka9X.png"  />  
</div>

# adonisjs-prometheus 

📊 Prometheus package for AdonisJS

## Installation

```sh
node ace add @julr/adonisjs-prometheus
```

## Usage

After installing the package, a configuration file is added to `config/prometheus.ts` in your application.

```ts
export default defineConfig({
  /**
   * Endpoint where metrics will be exposed
   */
  endpoint: '/metrics',

  /**
   * A prefix that will be added to all metrics
   * names
   */
  metricsPrefix: env.get('APP_NAME'),

  /**
   * List of IPs that are allowed to access the
   * metrics endpoint. If empty, then everyone
   * can access the endpoint
   */
  ipsWhitelist: [],

  /**
   * List of collectors that will be registered
   * and expose new metrics.
   *
   * Feel free to remove collectors that you
   * don't want to use
   */
  collectors: [
    httpCollector(),
    mailCollector(),
    lucidCollector(),
    cacheCollector(),
    systemCollector(),
  ],
})
```

The available options are:

- `endpoint`: The URL of the endpoint where metrics will be exposed. Defaults to `/metrics`.
- `metricsPrefix`: A prefix that will be added to all metric names. Defaults to the app name.
- `ipsWhitelist`: A list of IP addresses or CIDR ranges allowed to access the metrics endpoint. Supports both exact IPs (`'10.0.0.5'`) and CIDR notation (`'192.168.1.0/24'`). If empty, everyone can access it. Defaults to an empty array.
- `collectors`: The list of collectors that will be registered and expose new metrics. You can remove collectors you don't want to use.
- `enableExemplars`: Enable OpenMetrics exemplars support. When enabled, metrics will include trace context (`traceId` and `spanId`) from OTEL. Defaults to `false`.

## Collectors

Each collector accepts options to customize the metrics it exposes. Be sure to explore these options using your editor's auto-completion to learn more.

### HTTP Collector

Adds metrics to monitor HTTP requests:

#### Exposed Metrics

- `http_requests_total`: Counter for the total number of HTTP requests.
- `http_request_duration_seconds`: Histogram of HTTP request durations.

#### Options

- `shouldGroupStatusCode`: Groups HTTP status codes into 1xx, 2xx, 3xx, 4xx, and 5xx. Defaults to `false`.
- `excludedRoutes`: A list of routes to exclude from metrics. Defaults to an empty array. You can pass a list of `string` or a function `(ctx: HttpContext) => boolean`.
- `requestDuration.buckets`: The buckets for the histogram of HTTP request durations.

### System Collector

Adds metrics to monitor the host system's performance. See [Default Metrics](https://github.com/siimon/prom-client#default-metrics) for more information. The collector accepts the same options as the `prom-client` `collectDefaultMetrics` function.

### Lucid Collector

Adds metrics to monitor database queries made through `@adonisjs/lucid`.

> [!IMPORTANT]
> To use the Lucid collector, you must set `debug: true` in your `config/database.ts` file.

#### Exposed Metrics

- `lucid_query_duration_seconds`: Histogram of Lucid query durations. Labels include `connection`, `model`, and `method`.

#### Options

- `queryDuration.buckets`: The buckets for the histogram of Lucid query durations.

### Cache Collector

Adds metrics to monitor `@adonisjs/cache` operations.

The Cache Collector has two implementations:

#### New implementation (Recommended)

The recommended way to use the Cache Collector is now with `useNewCollector: true`, which leverages [BentoCache's native Prometheus plugin](https://bentocache.dev/docs/plugin-prometheus). This provides richer metrics and better integration with BentoCache.

```ts
cacheCollector({
  useNewCollector: true, // Enable the new implementation
  keyGroups: [
    [/^users:(\d+)$/, 'users:*'],
  ]
})
```

**Exposed Metrics:**

- `cache_hits`: Counter for the total number of cache hits
- `cache_misses`: Counter for the total number of cache misses
- `cache_writes`: Counter for the total number of cache writes
- `cache_deletes`: Counter for the total number of cache deletes
- `cache_clears`: Counter for the total number of cache clears
- `cache_graced_hits`: Counter for the total number of graced hits
- `cache_bus_messages_published`: Counter for bus messages published
- `cache_bus_messages_received`: Counter for bus messages received

**Options:**

- `useNewCollector`: Set to `true` to use BentoCache's native plugin (recommended)
- `keyGroups`: An array of `[RegExp, ((match: RegExpMatchArray) => string) | string]` tuples for grouping cache keys. See [BentoCache documentation](https://bentocache.dev/docs/plugin-prometheus) for more details.

> [!TIP]
> The modern implementation will become the default in a future major release, so we recommend migrating to it now.

#### Legacy Implementation

The legacy implementation uses event emitters to track cache operations. This is the default for backward compatibility but will be removed in future versions.

```ts
cacheCollector({
  keyGroups: [
    [/^users:(\d+)$/, 'users:*'],
  ]
})
```

**Exposed Metrics:**

- `cache_hits_total`: Counter for the total number of cache hits
- `cache_misses_total`: Counter for the total number of cache misses
- `cache_writes_total`: Counter for the total number of cache writes

**Options:**

- `keyGroups`: An array of `[RegExp, ((match: RegExpMatchArray) => string) | string]` tuples for grouping cache keys together. This helps avoid [high cardinality issues](https://stackoverflow.com/questions/46373442/how-dangerous-are-high-cardinality-labels-in-prometheus) when you have many unique cache keys.

**Example:**

```ts
cacheCollector({
  keyGroups: [
    [/^users:(\d+)$/, 'users:*'],
    [/^posts:(\d+)$/, 'posts:*'],
  ]
})
```


### Mail Collector

Adds metrics to monitor emails sent through `@adonisjs/mail`.

#### Exposed Metrics

- `mails_sent_total`: Counter for the total number of emails sent.

## Exemplars

[Exemplars](https://grafana.com/docs/grafana/latest/fundamentals/exemplars/) are a way to link metrics to traces. When enabled, this package will automatically attach `traceId` and `spanId` labels from the active OpenTelemetry span to your Counter and Histogram metrics.

### Setup

1. Install `@opentelemetry/api` as a dependency:

```sh
pnpm add @opentelemetry/api
```

2. Enable exemplars in your configuration:

```ts
export default defineConfig({
  enableExemplars: true,
  // ...
})
```

When `enableExemplars` is set to `true`, the metrics registry will automatically be set to use the `OpenMetrics` format, which is required for exemplars support.

### How it works

When exemplars are enabled, the API for incrementing counters and observing histograms changes. Instead of simple `inc()` and `observe()` calls, you need to pass an object with `labels` and `exemplarLabels`:

```ts
// Without exemplars
counter.inc({ method: 'GET', status: '200' })
histogram.observe({ route: '/users' }, 0.5)

// With exemplars
counter.inc({ labels: { method: 'GET', status: '200' }, exemplarLabels: { traceId: '...', spanId: '...' } })
histogram.observe({ labels: { route: '/users' }, exemplarLabels: { traceId: '...', spanId: '...' } }, 0.5)
```

This package handles this automatically: when `enableExemplars` is `true` in the global config and an active OpenTelemetry span exists, the `traceId` and `spanId` will be attached to metrics from the built-in collectors.

> [!NOTE]
> The API change only applies to metrics created with `enableExemplars: true` on the metric itself. If you create custom metrics using `prom-client` without setting `enableExemplars`, you can use the standard API (`counter.inc(labels)`) even when the global config has `enableExemplars: true`. However, if you enable exemplars on your custom metric, you'll need to use the exemplar API (`counter.inc({ labels, exemplarLabels, value })`).

### Known TypeScript issue

There's currently a typing bug where `exemplarLabels` is incorrectly typed. This causes TypeScript errors when using exemplars. The issue should be fixed in a future release. In the meantime, feel free to use type assertions (`as any`) when calling `inc()` or `observe()` with `exemplarLabels`.

### Requirements

- Your application must be instrumented with OpenTelemetry to have active spans
- The `@opentelemetry/api` package must be installed
- Your Prometheus server must support OpenMetrics format to scrape exemplars


## Custom metrics

To add your own metrics, you have two options:

### Use prom-client

You can directly use `prom-client` with the same registry :

```ts
import { Counter } from 'prom-client'

export const orderMetrics = new Counter({
  name: 'sent_orders',
  help: 'Total Orders Sent',
})

export default class OrderController {
  public async store({ request }: HttpContext) {
    // ...
    OrderMetric.inc()
    // ...
  }
}
```

### Create a custom collector

You can also create a custom collector to expose your metrics:

```ts
import { Collector } from '@julr/adonisjs-prometheus/collectors/collector'

export function appOrdersCollector() {
  return configProvider.create(async (app) => {
    const emitter = await app.container.make('emitter')
    const config = app.config.get<ResolvedPromConfig>('prometheus')

    return new MailCollector(emitter, config)
  })
}

export class AppOrdersCollector extends Collector {
  constructor(
    private emitter: EmitterService,
    options: CommonCollectorOptions,
  ) {
    super(options)
  }

  async register() {
    const orderMetrics = this.createGauge({
      name: 'sent_orders',
      help: 'Total Orders Sent',
    })

    /**
     * Let's imagine that your emitter emits a `new:order` event.
     * This is one way to collect metrics, but you can do it the way you want :
     * - Using a listener
     * - Using a DB Query and the `collect()` method of the gauge
     * - etc.
     */
    this.emitter.on('new:order', () => orderMetrics.inc())
  }
}
```

Then, add your collector to the `config/prometheus.ts` configuration file:

```ts
export default defineConfig({
  // ...
  collectors: [
    // ...
    appOrdersCollector(),
  ],
})
```

## Sponsors

If you like this project, [please consider supporting it by sponsoring it](https://github.com/sponsors/Julien-R44/). It will help a lot to maintain and improve it. Thanks a lot !

![](https://github.com/julien-r44/static/blob/main/sponsorkit/sponsors.png?raw=true)
