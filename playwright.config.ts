import { defineConfig } from '@playwright/test'

export default defineConfig({
  timeout: 60000, // 60 second timeout for multi-user collaboration tests
  use: {
    baseURL: 'http://localhost:4000',
  },
  webServer: {
    command: 'pnpm -C client build && pnpm -C client build:css && cd server && mix assets.build && mix phx.server',
    port: 4000,
    reuseExistingServer: !process.env.CI,
  },
  testDir: 'e2e',
})
