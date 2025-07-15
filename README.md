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
- `ipsWhitelist`: A list of IP addresses allowed to access the metrics endpoint. If empty, everyone can access it. Defaults to an empty array.
- `collectors`: The list of collectors that will be registered and expose new metrics. You can remove collectors you don't want to use.

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

#### Options

- `keyGroups`

An array of `[RegExp, ((match: RegExpMatchArray) => string) | string]` tuples. The first element of the tuple is a regular expression that will be used to match keys. The second element is either a string or a function that will be used to transform the matched key into a new key. This is useful for grouping keys together. For example, if you have a cache that stores users by their ID ( `users:1`, `users:2` ... ) and you want to register metrics for all users together, you can use this option like so:

```ts
prometheusPlugin({
  keyGroups: [
    [/^users:(\d+)$/, 'users:*'],
  ]
})
```

This may be a good practice if you have a lot of keys, because [high cardinality can become a problem with Prometheus](https://stackoverflow.com/questions/46373442/how-dangerous-are-high-cardinality-labels-in-prometheus).


#### Exposed Metrics

- `cache_hits_total`: Counter for the total number of cache hits.
- `cache_misses_total`: Counter for the total number of cache misses.
- `cache_writes_total`: Counter for the total number of cache writes.


### Mail Collector

Adds metrics to monitor emails sent through `@adonisjs/mail`.

#### Exposed Metrics

- `mails_sent_total`: Counter for the total number of emails sent.

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
