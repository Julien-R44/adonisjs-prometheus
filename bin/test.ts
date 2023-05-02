import { pathToFileURL } from 'node:url'
import { join } from 'desm'
import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import { specReporter } from '@japa/spec-reporter'
import { configure, processCliArgs, run } from '@japa/runner'
import { fileSystem } from '@japa/file-system'

/*
|--------------------------------------------------------------------------
| Configure tests
|--------------------------------------------------------------------------
|
| The configure method accepts the configuration to configure the Japa
| tests runner.
|
| The first method call "processCliArgs" process the command line arguments
| and turns them into a config object. Using this method is not mandatory.
|
| Please consult japa.dev/runner-config for the config docs.
*/
configure({
  ...processCliArgs(process.argv.slice(2)),
  files: ['test/**/*.spec.ts'],
  plugins: [
    assert(),
    apiClient('http://localhost:3333'),
    fileSystem({ basePath: join(import.meta.url, '..', 'test', '__app') }),
  ],
  reporters: [specReporter({ stackLinesCount: 2 })],
  importer: (filePath) => import(pathToFileURL(filePath).href),
})

/*
|--------------------------------------------------------------------------
| Run tests
|--------------------------------------------------------------------------
|
| The following "run" method is required to execute all the tests.
|
*/
run()
