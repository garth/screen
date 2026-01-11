import { expect, test } from '@playwright/test'
import { createVerifiedUser, loginUser } from './helpers'

test.describe('Preferences Page', () => {
  const testUser = {
    firstName: 'Preferences',
    lastName: 'Test User',
    password: 'password123',
  }

  async function createAndLoginUser(page: import('@playwright/test').Page) {
    const email = `preferences-${Date.now()}@example.com`
    await createVerifiedUser(page, { firstName: testUser.firstName, lastName: testUser.lastName, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    return email
  }

  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/preferences')
    await expect(page).toHaveURL('/login')
  })

  test('shows preferences page when authenticated', async ({ page }) => {
    await createAndLoginUser(page)
    await page.goto('/preferences')

    await expect(page).toHaveURL('/preferences')
    await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible()
  })

  test('displays current user name', async ({ page }) => {
    await createAndLoginUser(page)
    await page.goto('/preferences')

    await expect(page.getByLabel('First Name')).toHaveValue(testUser.firstName)
    await expect(page.getByLabel('Last Name')).toHaveValue(testUser.lastName)
  })

  test('updates name successfully', async ({ page }) => {
    await createAndLoginUser(page)
    await page.goto('/preferences')

    const newFirstName = 'Updated'
    const newLastName = 'Name'
    await page.getByLabel('First Name').fill(newFirstName)
    await page.getByLabel('Last Name').fill(newLastName)
    await page.getByRole('button', { name: 'Save Name' }).click()

    // Success toast should appear
    await expect(page.getByText('Name updated successfully')).toBeVisible()

    // Wait for update and reload to verify persistence
    await page.waitForTimeout(500)
    await page.reload()
    await expect(page.getByLabel('First Name')).toHaveValue(newFirstName)
    await expect(page.getByLabel('Last Name')).toHaveValue(newLastName)

    // Nav should also show new name in avatar alt text
    await expect(page.locator('nav').getByAltText(`${newFirstName} ${newLastName}`)).toBeVisible()
  })

  test('shows validation error for empty name', async ({ page }) => {
    await createAndLoginUser(page)
    await page.goto('/preferences')

    await page.getByLabel('First Name').fill('')
    await page.getByRole('button', { name: 'Save Name' }).click()

    await expect(page.getByText('First name is required')).toBeVisible()
  })

  test('changes password successfully', async ({ page }) => {
    const email = await createAndLoginUser(page)
    await page.goto('/preferences')

    const newPassword = 'newpassword456'
    await page.getByLabel('Current Password').fill(testUser.password)
    await page.getByLabel('New Password', { exact: true }).fill(newPassword)
    await page.getByLabel('Confirm New Password').fill(newPassword)
    await page.getByRole('button', { name: 'Change Password' }).click()

    // Success toast should appear
    await expect(page.getByText('Password changed successfully')).toBeVisible()

    // Open user menu and logout, then login with new password to verify
    await page.locator('.user-menu button').click()
    await page.getByRole('button', { name: 'Log out' }).click()
    await page.waitForTimeout(500)
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(newPassword)
    await page.getByRole('button', { name: 'Log In' }).click()

    await expect(page).toHaveURL('/')
  })

  test('shows error for incorrect current password', async ({ page }) => {
    await createAndLoginUser(page)
    await page.goto('/preferences')

    await page.getByLabel('Current Password').fill('wrongpassword')
    await page.getByLabel('New Password', { exact: true }).fill('newpassword456')
    await page.getByLabel('Confirm New Password').fill('newpassword456')
    await page.getByRole('button', { name: 'Change Password' }).click()

    await expect(page.getByText('Current password is incorrect')).toBeVisible()
  })

  test('shows error for mismatched new passwords', async ({ page }) => {
    await createAndLoginUser(page)
    await page.goto('/preferences')

    await page.getByLabel('Current Password').fill(testUser.password)
    await page.getByLabel('New Password', { exact: true }).fill('newpassword456')
    await page.getByLabel('Confirm New Password').fill('differentpassword')
    await page.getByRole('button', { name: 'Change Password' }).click()

    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })

  test('shows validation error for short password', async ({ page }) => {
    await createAndLoginUser(page)
    await page.goto('/preferences')

    await page.getByLabel('Current Password').fill(testUser.password)
    await page.getByLabel('New Password', { exact: true }).fill('short')
    await page.getByLabel('Confirm New Password').fill('short')
    await page.getByRole('button', { name: 'Change Password' }).click()

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
  })

  test.describe('Delete Account', () => {
    test('shows delete account section', async ({ page }) => {
      await createAndLoginUser(page)
      await page.goto('/preferences')

      await expect(page.getByRole('heading', { name: 'Delete Account' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Delete Account' })).toBeVisible()
    })

    test('shows confirmation dialog when clicking delete', async ({ page }) => {
      await createAndLoginUser(page)
      await page.goto('/preferences')

      await page.getByRole('button', { name: 'Delete Account' }).click()

      // Dialog should appear with warning
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Delete Account?')).toBeVisible()
      await expect(dialog.getByText('This will permanently delete your account')).toBeVisible()
      await expect(dialog.getByText('This action cannot be undone.')).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Delete My Account' })).toBeVisible()
    })

    test('dismisses dialog with cancel button', async ({ page }) => {
      await createAndLoginUser(page)
      await page.goto('/preferences')

      await page.getByRole('button', { name: 'Delete Account' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('dismisses dialog with escape key', async ({ page }) => {
      await createAndLoginUser(page)
      await page.goto('/preferences')

      await page.getByRole('button', { name: 'Delete Account' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Focus the dialog and press escape
      await dialog.focus()
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
    })

    test('deletes account and redirects to home', async ({ page }) => {
      const email = await createAndLoginUser(page)
      await page.goto('/preferences')

      // Open dialog and confirm deletion
      await page.getByRole('button', { name: 'Delete Account' }).click()
      await page.getByRole('button', { name: 'Delete My Account' }).click()

      // Should redirect to home page
      await expect(page).toHaveURL('/')

      // Trying to access protected page should redirect to login
      await page.goto('/preferences')
      await expect(page).toHaveURL('/login')

      // Trying to login with deleted account should fail
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password').fill(testUser.password)
      await page.getByRole('button', { name: 'Log In' }).click()

      await expect(page.getByText('Invalid email or password')).toBeVisible()
    })
  })
})
