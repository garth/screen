import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'pnpm build && pnpm preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    env: {
      ALLOW_TEST_ENDPOINTS: 'true',
    },
  },
  testDir: 'e2e',
})
