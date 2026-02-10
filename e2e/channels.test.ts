import { expect, test } from '@playwright/test'

test.describe('Channel Public View', () => {
  test('shows error for non-existent channel slug', async ({ page }) => {
    await page.goto('/channel/non-existent-slug')
    await page.waitForLoadState('networkidle')

    // Should show error message (channel not found or failed to load)
    await expect(page.getByText(/not found|failed to load/i)).toBeVisible({ timeout: 10000 })
  })

  test('shows go home link on channel error', async ({ page }) => {
    await page.goto('/channel/does-not-exist')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible({ timeout: 10000 })
  })
})
