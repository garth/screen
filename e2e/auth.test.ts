import { expect, test } from '@playwright/test'
import { createVerifiedUser, createUnverifiedUser, loginUser, waitForLiveView } from './helpers'

test.describe('Authentication', () => {
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    password: 'password1234',
  }

  test('register new user shows email sent message', async ({ page }) => {
    const email = `register-${Date.now()}@example.com`
    await page.goto('/users/register')
    await waitForLiveView(page)

    // Fill registration form (no password — uses magic link auth)
    await page.getByLabel('First name').fill(testUser.firstName)
    await page.getByLabel('Last name').fill(testUser.lastName)
    await page.getByLabel('Email').fill(email)

    // Submit form
    await page.getByRole('button', { name: 'Create an account' }).click()

    // Should redirect to login page with flash about email sent
    await expect(page).toHaveURL('/users/log-in')
    await expect(page.getByText(email)).toBeVisible()
  })

  test('login with verified user', async ({ page }) => {
    const email = `login-${Date.now()}@example.com`

    // Create verified user with password via test helper
    await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })

    // Login with password
    await loginUser(page, { email, password: testUser.password })

    // Should redirect to presentations page
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/users/log-in')
    await waitForLiveView(page)

    const passwordForm = page.locator('#login_form_password')
    await passwordForm.getByLabel('Email').fill('nonexistent@example.com')
    await passwordForm.getByLabel('Password').fill('wrongpassword12')
    await passwordForm.getByRole('button', { name: 'Log in and stay logged in' }).click()

    // Should redirect back to login page with error flash
    await expect(page).toHaveURL('/users/log-in')
    await expect(page.getByText('Invalid email or password')).toBeVisible()
  })

  test('register with existing email shows error', async ({ page }) => {
    const email = `duplicate-${Date.now()}@example.com`

    // Create first user via test helper
    await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })

    // Try to register with same email
    await page.goto('/users/register')
    await waitForLiveView(page)
    await page.getByLabel('First name').fill('Another')
    await page.getByLabel('Last name').fill('User')
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Create an account' }).click()

    // Should stay on register page and show validation error
    await expect(page).toHaveURL('/users/register')
    await expect(page.getByText('has already been taken')).toBeVisible()
  })

  test('magic link confirmation logs user in', async ({ page }) => {
    const email = `verify-${Date.now()}@example.com`

    // Create unverified user WITHOUT password and get login token
    // (unconfirmed users with passwords cannot use magic links)
    const { verificationToken } = await createUnverifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
    })

    // Track any page errors
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    // Visit magic link URL
    await page.goto(`/users/log-in/${verificationToken}`)
    await waitForLiveView(page)

    // Should show confirmation page
    await expect(page.getByText(`Welcome ${testUser.firstName}`)).toBeVisible()

    // Click confirm button
    await page.getByRole('button', { name: 'Confirm and stay logged in' }).click()

    // Should redirect to presentations after login
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    // Should not have any JavaScript errors
    expect(errors).toHaveLength(0)
  })

  test('invalid magic link shows error', async ({ page }) => {
    // Visit invalid magic link
    await page.goto('/users/log-in/invalid-token')
    await waitForLiveView(page)

    // Should redirect to login with error flash
    await expect(page).toHaveURL('/users/log-in')
    await expect(page.getByText('Magic link is invalid or it has expired')).toBeVisible()
  })

  test('magic link request shows confirmation message', async ({ page }) => {
    const email = `magic-${Date.now()}@example.com`

    // Create verified user
    await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })

    // Go to login page
    await page.goto('/users/log-in')
    await waitForLiveView(page)

    // Fill email in magic link form and submit
    const magicForm = page.locator('#login_form_magic')
    await magicForm.getByLabel('Email').fill(email)
    await magicForm.getByRole('button', { name: 'Log in with email' }).click()

    // Should show confirmation message
    await expect(
      page.getByText('you will receive instructions for logging in shortly'),
    ).toBeVisible({ timeout: 10000 })
  })

  test('logout', async ({ page }) => {
    const email = `logout-${Date.now()}@example.com`

    // Create verified user and login
    await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    // Wait for the SPA to load and show the user menu
    await page.waitForSelector('.dropdown button', { timeout: 15000 })

    // Open user menu dropdown and click logout
    await page.locator('.dropdown button').click()
    await page.getByRole('menuitem', { name: 'Log out' }).click()

    // Should navigate away from the authenticated area
    await page.waitForURL((url) => !url.pathname.startsWith('/presentations'), { timeout: 10000 })
  })
})
