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

to enable them, simply register the `CollectPerformanceMetrics` as the first item in the start/kernel.ts:

```
Server.middleware.register([
  // Make it first in the list for reliable metrics.
  () => import('@ioc:Adonis/Prometheus/Middlewares/CollectPerformanceMetrics'),
  () => import('@ioc:Adonis/Core/BodyParser'),
  ...
])
```

## Acknowledgments
- [tnkemdilim/adonis-prometheus](https://github.com/tnkemdilim/adonis-prometheus) - At first, I just adapted his library to support Adonis5.
