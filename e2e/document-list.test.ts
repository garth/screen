import { expect, test } from '@playwright/test'
import { createVerifiedUser, loginUser } from './helpers'

test.describe('Document List', () => {
  const testUser = {
    firstName: 'DocList',
    lastName: 'Tester',
    password: 'password123',
  }

  test.describe('Document List Sync', () => {
    test('shows newly created presentation in list after creation', async ({ page }) => {
      const email = `doclist-create-${Date.now()}@example.com`

      await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
      await loginUser(page, { email, password: testUser.password })
      await expect(page).toHaveURL('/')

      await page.goto('/presentations')
      await page.waitForLoadState('networkidle')

      // Should show empty state initially
      await expect(page.getByText("You don't have any presentations yet")).toBeVisible({ timeout: 10000 })

      // Create a new presentation via UI
      await page.getByRole('button', { name: 'New Presentation' }).click()
      await expect(page).toHaveURL(/\/presentation\/[^/]+\/edit/)

      // Wait for editor and set a title
      const titleInput = page.locator('input[type="text"]').first()
      await expect(titleInput).toBeVisible({ timeout: 10000 })
      await titleInput.fill('My New Presentation')

      // Wait for sync
      await page.waitForTimeout(1000)

      // Go back to presentations list
      await page.goto('/presentations')
      await page.waitForLoadState('networkidle')

      // New presentation should appear with the title we set
      await expect(page.getByText('My New Presentation')).toBeVisible({ timeout: 10000 })
    })

    test('updates title in list when presentation is edited', async ({ page }) => {
      const email = `doclist-update-${Date.now()}@example.com`

      await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
      await loginUser(page, { email, password: testUser.password })
      await expect(page).toHaveURL('/')

      // Create presentation via UI
      await page.goto('/presentations')
      await page.waitForLoadState('networkidle')
      await page.getByRole('button', { name: 'New Presentation' }).click()
      await expect(page).toHaveURL(/\/presentation\/[^/]+\/edit/)

      // Set initial title
      const titleInput = page.locator('input[type="text"]').first()
      await expect(titleInput).toBeVisible({ timeout: 10000 })
      await titleInput.fill('Original Title')
      await page.waitForTimeout(1000)

      // Verify in list
      await page.goto('/presentations')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('Original Title')).toBeVisible({ timeout: 10000 })

      // Go back and edit
      await page.getByRole('link', { name: 'Edit' }).click()
      const titleInput2 = page.locator('input[type="text"]').first()
      await expect(titleInput2).toBeVisible({ timeout: 10000 })

      // Update title
      await titleInput2.fill('Updated Title')
      await page.waitForTimeout(1000)

      // Go back to list
      await page.goto('/presentations')
      await page.waitForLoadState('networkidle')

      // Updated title should appear
      await expect(page.getByText('Updated Title')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Original Title')).not.toBeVisible()
    })
  })

  test.describe('Connection Status', () => {
    test('shows content after sync completes', async ({ page }) => {
      const email = `doclist-sync-${Date.now()}@example.com`

      await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
      await loginUser(page, { email, password: testUser.password })
      await expect(page).toHaveURL('/')

      await page.goto('/presentations')

      // Should show either loading or content (empty state)
      await expect(page.getByRole('button', { name: 'New Presentation' })).toBeVisible({ timeout: 15000 })

      // Empty state should be visible after sync
      await expect(page.getByText("You don't have any presentations yet")).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Document Badges', () => {
    test('shows private badge for new presentations', async ({ page }) => {
      const email = `doclist-private-${Date.now()}@example.com`

      await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
      await loginUser(page, { email, password: testUser.password })
      await expect(page).toHaveURL('/')

      // Create presentation via UI
      await page.goto('/presentations')
      await page.waitForLoadState('networkidle')
      await page.getByRole('button', { name: 'New Presentation' }).click()

      // Set title
      const titleInput = page.locator('input[type="text"]').first()
      await expect(titleInput).toBeVisible({ timeout: 10000 })
      await titleInput.fill('My Private Pres')
      await page.waitForTimeout(1000)

      // Check list
      await page.goto('/presentations')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('My Private Pres')).toBeVisible({ timeout: 10000 })
      // Private badge should be visible (new presentations are private by default)
      await expect(page.getByText('Private', { exact: true })).toBeVisible()
    })
  })
})
