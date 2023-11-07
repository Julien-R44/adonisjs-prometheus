import { join } from 'desm'
import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import { configure, processCLIArgs, run } from '@japa/runner'
import { fileSystem } from '@japa/file-system'
import { BASE_URL } from '../test_helpers/setup.js'

processCLIArgs(process.argv.slice(2))
configure({
  files: ['test/**/*.spec.ts'],
  plugins: [assert(), apiClient('http://localhost:3333'), fileSystem({ basePath: BASE_URL })],
})

run()
