import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true, // CJS test files can't `require('vitest')` — use ambient describe/it/expect instead
    environment: 'node',
    include: ['test/**/*.test.js'],
    testTimeout: 30000,
    hookTimeout: 60000,
    // Each test file mutates process.env (Mongo URI, JWT secrets) and requires
    // ../app as a singleton — isolate per file so files can't bleed state.
    pool: 'forks',
  },
})
