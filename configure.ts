import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  /**
   * Publish config file
   */
  await command.publishStub('prometheus/config.stub')

  /**
   * Add provider to the rc file
   */
  const codemods = await command.createCodemods()
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@julr/adonisjs-prometheus/prometheus_provider')
  })
}
