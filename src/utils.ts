import type { CommonCollectorOptions } from './types.js'

export function mergeCommonAndCollectorOptions(
  commonOptions: CommonCollectorOptions,
  collectorOptions: any,
) {
  return { ...commonOptions, ...collectorOptions }
}
