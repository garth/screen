import { defineConfig } from '@playwright/test'

export default defineConfig({
  timeout: 60000, // 60 second timeout for multi-user collaboration tests
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: [
    {
      command: 'pnpm build && pnpm preview',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      env: {
        ALLOW_TEST_ENDPOINTS: 'true',
      },
    },
    {
      command: 'pnpm hocuspocus',
      port: 1234,
      reuseExistingServer: !process.env.CI,
    },
  ],
  testDir: 'e2e',
})
