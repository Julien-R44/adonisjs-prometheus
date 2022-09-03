declare module '@ioc:Adonis/Prometheus/Middlewares/CollectPerformanceMetrics' {
  import type { ApplicationContract } from '@ioc:Adonis/Core/Application'
  import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

  export interface MiddlewareContract {
    new (application: ApplicationContract): {
      handle(ctx: HttpContextContract, next: () => Promise<void>): any
    }
  }

  const CollectPerformanceMetricsMiddleware: MiddlewareContract
  export default CollectPerformanceMetricsMiddleware
}
