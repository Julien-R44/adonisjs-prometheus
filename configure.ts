import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  await command.publishStub('prometheus/config.stub')

  await command.updateRcFile((rcFile) => {
    rcFile.addProvider('@julr/adonisjs-prometheus/prometheus_provider')
  })
}
