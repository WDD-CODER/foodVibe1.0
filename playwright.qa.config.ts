import { defineConfig, devices } from '@playwright/test'

/**
 * Code QA (plan 413) — run by scripts/qa/code-qa/run.mjs against the QA stack (app 4205), never by `npm run e2e`.
 *   sweep — e2e-qa/sweep.spec.ts: every page × D/T/M, mechanical checks
 *   e2e   — the existing e2e/*.spec.ts flows with baseURL 4205, signed in through a refresh cookie
 *           (QA_CODE_STORAGE). Only the read-only cook-view flow by default; QA_CODE_E2E=all runs every
 *           flow, which also creates and deletes records in the QA user's kitchen.
 */
const APP = process.env['QA_CODE_APP'] || 'http://localhost:4205'

export default defineConfig({
  timeout: 120_000,
  retries: 0,
  workers: Number(process.env['QA_CODE_WORKERS'] || 2),
  outputDir: 'bugs/qa-runs/code-qa/.pw-results',
  reporter: [['line'], ['json', { outputFile: process.env['QA_CODE_PW_JSON'] || 'bugs/qa-runs/code-qa/.pw-results/report.json' }]],
  use: { baseURL: APP, trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    {
      name: 'sweep',
      testDir: './e2e-qa',
      testMatch: /sweep\.spec\.ts$/,
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'e2e',
      testDir: './e2e',
      testMatch: process.env['QA_CODE_E2E'] === 'all' ? /\.spec\.ts$/ : /cook-view\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: APP, storageState: process.env['QA_CODE_STORAGE'] || undefined }
    }
  ]
})
