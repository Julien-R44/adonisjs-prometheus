<div align="center">
  <img src="https://i.imgur.com/QZf8jrj.png" width="300px" />  
  <br/>
  <h3>Adonis5-Prometheus</h3>
  <p>Simple Prometheus Wrapper for Adonis</p>
  <img src="https://img.shields.io/npm/v/adonis5-prometheus.svg?style=for-the-badge&logo=npm" />
  <img src="https://img.shields.io/npm/l/adonis5-prometheus?color=blueviolet&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript" />
</div>

## Installation
```
npm i adonis5-prometheus
node ace configure adonis5-prometheus
```

## Usage

A configuration file has been added in `config/prometheus.ts`.

By default the system metrics are collected ( `systemMetrics.enabled: true` ), so now you can call the endpoint `{{host}}/metrics` to get the measured metrics.

## Built-in Metrics
There currently exists built-ins metrics such as:
- HTTP Metric: Total time each HTTP request takes.
- Uptime Metric: Uptime performance of the application.
- Throughput metric: No. of request handled.

To enable them, simply register the `CollectPerformanceMetrics` as the first item in the start/kernel.ts:

```
Server.middleware.register([
  // Make it first in the list for reliable metrics.
  () => import('@ioc:Adonis/Prometheus/Middlewares/CollectPerformanceMetrics'),
  () => import('@ioc:Adonis/Core/BodyParser'),
  ...
])
```

## Custom Metrics
```
// Register your custom metrics in the separate file you want.
export const OrderMetric = new Prometheus.Counter({
  name: 'sent_orders',
  help: 'Total Orders Sent',
})

// OrderController.ts
import { OrderMetric } from 'App/Metrics

export default class OrderController {
  public async store({ request }: HttpContextContract) {
    const order = await request.validate({ schema: OrderSchema })

    // ...
    OrderMetric.inc()
    // ...
  }
}

/*
  When hitting `{{host}}/metrics` you will now get the following:
  # HELP send_orders Total Orders Sent
  # TYPE send_orders counter
  sent_orders 2
*/
```

## Documentation
This library is a wrapper for prom-client. The prom-client object can be imported with `import Prometheus from '@ioc:Adonis/Prometheus`. Check out the [documentation](https://github.com/siimon/prom-client) for more information.

## Acknowledgments
- [tnkemdilim/adonis-prometheus](https://github.com/tnkemdilim/adonis-prometheus) - At first, I just adapted his library to support Adonis5.
