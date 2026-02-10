import { expect, test } from '@playwright/test'
import { createVerifiedUser, createDocument, loginUser } from './helpers'

test.describe('Themes List', () => {
  const testUser = {
    firstName: 'Theme',
    lastName: 'Tester',
    password: 'password123',
  }

  test('requires authentication to view themes list', async ({ page }) => {
    await page.goto('/themes')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows themes page with create button', async ({ page }) => {
    const email = `theme-list-${Date.now()}@example.com`
    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/themes')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'New Theme' })).toBeVisible({ timeout: 10000 })
  })

  test('creates a new theme and redirects to edit page', async ({ page }) => {
    const email = `theme-create-${Date.now()}@example.com`
    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/themes')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'New Theme' }).click()
    await expect(page).toHaveURL(/\/theme\/[^/]+\/edit/, { timeout: 10000 })
  })
})

test.describe('Theme Editor', () => {
  const testUser = {
    firstName: 'ThemeEdit',
    lastName: 'Tester',
    password: 'password123',
  }

  test('displays editor for owner with title and color inputs', async ({ page }) => {
    const email = `theme-edit-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Editable Theme',
      type: 'theme',
      meta: { title: 'Editable Theme' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/theme/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Title input
    const titleInput = page.locator('input[type="text"]').first()
    await expect(titleInput).toBeVisible({ timeout: 10000 })

    // Color inputs
    await expect(page.locator('#bg-color')).toBeVisible()
    await expect(page.locator('#text-color')).toBeVisible()

    // Font selector
    await expect(page.locator('select').first()).toBeVisible()

    // Preview section
    await expect(page.getByRole('heading', { name: 'Preview' })).toBeVisible()
  })

  test('shows contrast ratio indicator', async ({ page }) => {
    const email = `theme-contrast-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Contrast Theme',
      type: 'theme',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/theme/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Should show contrast ratio
    await expect(page.getByText('Contrast ratio:')).toBeVisible({ timeout: 10000 })
  })

  test('system theme shows read-only badge', async ({ page }) => {
    const email = `theme-system-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'System Theme',
      type: 'theme',
      meta: { title: 'System Theme', isSystemTheme: true },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/theme/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Should show system theme badge
    await expect(page.getByText('System Theme (Read Only)')).toBeVisible({ timeout: 10000 })
  })

  test('owner can delete non-system theme', async ({ page }) => {
    const email = `theme-delete-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Theme to Delete',
      type: 'theme',
      meta: { title: 'Theme to Delete' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/theme/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    const deleteButton = page.getByRole('button', { name: 'Delete', exact: true })
    await expect(deleteButton).toBeVisible({ timeout: 10000 })
    await deleteButton.click()

    // Confirm dialog
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete' }).click()

    await expect(page).toHaveURL(/\/themes/, { timeout: 10000 })
  })
})
