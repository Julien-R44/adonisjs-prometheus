import type Configure from '@adonisjs/core/commands/configure'

import { stubsRoot } from './stubs/index.js'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  /**
   * Publish config file
   */
  await codemods.makeUsingStub(stubsRoot, 'prometheus/config.stub', {})

  /**
   * Add provider to the rc file
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@julr/adonisjs-prometheus/prometheus_provider')
  })
}
