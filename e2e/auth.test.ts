import { expect, test } from '@playwright/test'
import { createVerifiedUser, createUnverifiedUser, createPasswordReset, loginUser } from './helpers'

test.describe('Authentication', () => {
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    password: 'password123',
  }

  test('register new user shows verification message', async ({ page }) => {
    const email = `register-${Date.now()}@example.com`
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    // Fill registration form
    await page.getByLabel('First Name').fill(testUser.firstName)
    await page.getByLabel('Last Name').fill(testUser.lastName)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(testUser.password)

    // Submit form
    await page.getByRole('button', { name: 'Register' }).click()

    // Should show "check your email" message
    await expect(page.getByText('Check your email')).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })

  test('unverified user cannot login', async ({ page }) => {
    const email = `unverified-${Date.now()}@example.com`

    // Register but don't verify
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('First Name').fill(testUser.firstName)
    await page.getByLabel('Last Name').fill(testUser.lastName)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(testUser.password)
    await page.getByRole('button', { name: 'Register' }).click()
    await expect(page.getByText('Check your email')).toBeVisible()

    // Try to login - user doesn't exist yet (only created after verification)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(testUser.password)
    await page.getByRole('button', { name: 'Log In' }).click()

    // Should show invalid credentials (user doesn't exist until verified)
    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 10000 })
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
    await expect(page).toHaveURL('/presentations')

    // Open user menu and click logout
    await page.locator('.user-menu button').click()
    await page.getByRole('button', { name: 'Log out' }).click()

    // Wait for logout to process then reload to verify session cleared
    await page.waitForTimeout(500)
    await page.reload()

    // Should show logged out state
    await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible()
  })

  test('login with verified user', async ({ page }) => {
    const email = `login-${Date.now()}@example.com`

    // Create verified user
    await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })

    // Login
    await loginUser(page, { email, password: testUser.password })

    // Should redirect to activity page and show logged in state
    await expect(page).toHaveURL('/presentations')
    await expect(page.locator('nav').getByAltText(`${testUser.firstName} ${testUser.lastName}`)).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.getByLabel('Email').fill('nonexistent@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Log In' }).click()

    // Should stay on login page and show error
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Invalid email or password')).toBeVisible()
  })

  test('register with existing email shows error', async ({ page }) => {
    const email = `duplicate-${Date.now()}@example.com`

    // Create first user directly in database
    await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })

    // Try to register with same email
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('First Name').fill('Another')
    await page.getByLabel('Last Name').fill('User')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(testUser.password)
    await page.getByRole('button', { name: 'Register' }).click()

    // Should stay on register page and show error
    await expect(page).toHaveURL('/register')
    await expect(page.getByText('Email already registered')).toBeVisible()
  })

  test('email verification redirects to login with success toast', async ({ page }) => {
    const email = `verify-${Date.now()}@example.com`

    // Create unverified user and get verification token
    const { verificationToken } = await createUnverifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })

    // Track any page errors (would catch infinite loop errors)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    // Visit verification URL
    await page.goto(`/verify-email?token=${verificationToken}`)

    // Should redirect to login page
    await expect(page).toHaveURL('/login?verified=true')

    // Should show success toast
    await expect(page.getByText('Email verified')).toBeVisible()

    // Should not have any JavaScript errors (catches infinite loop issues)
    expect(errors).toHaveLength(0)

    // User should now be able to log in
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(testUser.password)
    await page.getByRole('button', { name: 'Log In' }).click()

    await expect(page).toHaveURL('/presentations')
  })

  test('forgot password shows check email message', async ({ page }) => {
    const email = `forgot-${Date.now()}@example.com`

    // Create verified user
    await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })

    // Go to forgot password page
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    // Fill in email
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Send Reset Link' }).click()

    // Should show success message
    await expect(page.getByText('Check your email')).toBeVisible()
  })

  test('reset password with valid token works', async ({ page }) => {
    const email = `reset-${Date.now()}@example.com`
    const newPassword = 'newpassword123'

    // Create verified user
    await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })

    // Create password reset token
    const { resetToken } = await createPasswordReset(page, email)

    // Go to reset password page
    await page.goto(`/reset-password?token=${resetToken}`)

    // Should show password reset form
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible()

    // Fill in new password
    await page.getByLabel('New Password').fill(newPassword)
    await page.getByLabel('Confirm Password').fill(newPassword)
    await page.getByRole('button', { name: 'Reset Password' }).click()

    // Should redirect to login with success message
    await expect(page).toHaveURL('/login?reset=true')
    await expect(page.getByText('Password reset')).toBeVisible()

    // Should be able to login with new password
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(newPassword)
    await page.getByRole('button', { name: 'Log In' }).click()

    await expect(page).toHaveURL('/presentations')
  })

  test('reset password with invalid token shows error', async ({ page }) => {
    // Go to reset password page with invalid token
    await page.goto('/reset-password?token=invalid-token')

    // Should show error message
    await expect(page.getByText('Reset Failed')).toBeVisible()
    await expect(page.getByText('Invalid or expired reset link')).toBeVisible()

    // Should show link to request new reset
    await expect(page.getByRole('link', { name: 'Request New Link' })).toBeVisible()
  })

  test('reset password with missing token shows error', async ({ page }) => {
    // Go to reset password page without token
    await page.goto('/reset-password')

    // Should show error message
    await expect(page.getByText('Reset Failed')).toBeVisible()
    await expect(page.getByText('Missing reset token')).toBeVisible()
  })
})
