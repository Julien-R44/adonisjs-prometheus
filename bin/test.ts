import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import { fileSystem } from '@japa/file-system'
import { configure, processCLIArgs, run } from '@japa/runner'

import { BASE_URL } from '../tests/helpers.js'

processCLIArgs(process.argv.slice(2))

configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert(), apiClient('http://localhost:3333'), fileSystem({ basePath: BASE_URL })],
})

run()
