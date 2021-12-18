<div align="center">
  <img src="https://i.imgur.com/QZf8jrj.png" width="300px" />  
  <br/>
  <h3>Adonis5-Prometheus</h3>
  <p>Simple Prometheus Wrapper for Adonis</p>
</div>

## Installation
```
npm i adonis5-prometheus
node ace configure adonis5-prometheus
```

## Usage

A configuration file has been added in `config/prometheus.ts`.

By default the system metrics are collected ( `systemMetrics.enabled: true` ), so now you can call the endpoint {{host}}/metrics to get the measured metrics.

[npm-image]: https://img.shields.io/npm/v/adonis5-prometheus.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/adonis5-prometheus "npm"

[license-image]: https://img.shields.io/npm/l/adonis5-prometheus?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"
