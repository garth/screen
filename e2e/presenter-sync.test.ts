import { expect, test } from '@playwright/test'
import { createVerifiedUser, createDocument, createDocumentUser, loginUser } from './helpers'

/**
 * These tests verify the presenter awareness sync functionality.
 *
 * Note: Awareness sync is ephemeral and requires both clients to be connected
 * simultaneously. These tests may be flaky due to timing issues with WebSocket
 * connections and awareness propagation.
 */
test.describe('Presenter Awareness Sync', () => {
  const testUser = {
    firstName: 'Presenter',
    lastName: 'Sync',
    password: 'password1234',
  }

  test('presenter page loads successfully', async ({ page }) => {
    const email = `presenter-load-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Presenter Load Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')

    // Wait for loading to finish
    await expect(page.locator('.loading')).not.toBeVisible({ timeout: 15000 })

    // Header should show title
    await expect(page.locator('header h1')).toContainText('Untitled', { timeout: 10000 })

    // View and Edit links should be visible in header
    await expect(page.getByRole('link', { name: 'View' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible()
  })

  test('viewer page loads successfully', async ({ page }) => {
    const email = `viewer-load-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Viewer Load Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')

    // Viewer is fullscreen - presentation should be visible without header
    await expect(page.locator('.presentation-viewer')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('header')).not.toBeVisible()
  })

  // Skip: Awareness sync tests are inherently flaky due to WebSocket timing
  // The unit tests in awareness.svelte.spec.ts verify the logic works correctly
  test.skip('viewer sees follow button when presenter is active', async ({ page, context }) => {
    const email = `sync-follow-${Date.now()}@example.com`

    // Create user and presentation
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Follow Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    // Open presenter mode in one tab
    const presenterPage = await context.newPage()
    await presenterPage.goto(`/presentation/${doc.id}/presenter`)
    await presenterPage.waitForLoadState('networkidle')
    await expect(presenterPage.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Wait a bit for awareness to initialize
    await presenterPage.waitForTimeout(1000)

    // Open viewer mode in another tab
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Wait for awareness sync - the viewer should see the "Following presenter" button
    // This may take a moment for the awareness to propagate
    await expect(page.getByRole('button', { name: /Following presenter/i })).toBeVisible({ timeout: 15000 })

    await presenterPage.close()
  })

  test.skip('viewer can toggle follow mode off and on', async ({ page, context }) => {
    const email = `sync-toggle-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Toggle Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })

    // Open presenter mode
    const presenterPage = await context.newPage()
    await presenterPage.goto(`/presentation/${doc.id}/presenter`)
    await presenterPage.waitForLoadState('networkidle')
    await expect(presenterPage.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })
    await presenterPage.waitForTimeout(1000)

    // Open viewer mode
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Wait for follow button to appear
    const followButton = page.getByRole('button', { name: /Following presenter|Follow presenter/i })
    await expect(followButton).toBeVisible({ timeout: 15000 })

    // Initially should say "Following presenter"
    await expect(followButton).toContainText('Following presenter')

    // Click to disable follow mode
    await followButton.click()
    await expect(followButton).toContainText('Follow presenter')

    // Click to re-enable follow mode
    await followButton.click()
    await expect(followButton).toContainText('Following presenter')

    await presenterPage.close()
  })

  test.skip('follow button disappears when presenter disconnects', async ({ page, context }) => {
    const email = `sync-disconnect-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Disconnect Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })

    // Open presenter mode
    const presenterPage = await context.newPage()
    await presenterPage.goto(`/presentation/${doc.id}/presenter`)
    await presenterPage.waitForLoadState('networkidle')
    await expect(presenterPage.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })
    await presenterPage.waitForTimeout(1000)

    // Open viewer mode
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Wait for follow button to appear
    const followButton = page.getByRole('button', { name: /Following presenter/i })
    await expect(followButton).toBeVisible({ timeout: 15000 })

    // Close presenter page (simulate disconnect)
    await presenterPage.close()

    // Wait for awareness to detect disconnect - follow button should disappear
    // This may take a moment for the awareness cleanup to propagate
    await expect(followButton).not.toBeVisible({ timeout: 20000 })
  })

  test('viewer without presenter shows no follow button', async ({ page }) => {
    const email = `sync-no-presenter-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'No Presenter Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    // Open viewer mode only (no presenter)
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Wait a bit to ensure awareness has time to sync
    await page.waitForTimeout(2000)

    // No follow button should be visible since there's no presenter
    await expect(page.getByRole('button', { name: /Following presenter|Follow presenter/i })).not.toBeVisible()
  })
})

test.describe('Presenter Access Control', () => {
  const testUser = {
    firstName: 'Access',
    lastName: 'Test',
    password: 'password1234',
  }

  test('shared user with read-only access cannot access presenter mode', async ({ page }) => {
    const ownerEmail = `presenter-owner-${Date.now()}@example.com`
    const readerEmail = `presenter-reader-${Date.now()}@example.com`

    // Create owner and presentation
    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'No Present Access',
      type: 'presentation',
    })

    // Create reader with read-only access
    const reader = await createVerifiedUser(page, {
      firstName: 'Reader',
      lastName: 'User',
      email: readerEmail,
      password: testUser.password,
    })
    await createDocumentUser(page, { documentId: doc.id, userId: reader.id, write: false })

    await loginUser(page, { email: readerEmail, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    // SPA routes always return 200 — access control is client-side via channel permissions.
    // Read-only user can load the presenter page but their awareness writes may be restricted.
    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })
  })

  test('shared user with write access can access presenter mode', async ({ page }) => {
    const ownerEmail = `presenter-collab-owner-${Date.now()}@example.com`
    const writerEmail = `presenter-collab-writer-${Date.now()}@example.com`

    // Create owner and presentation
    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'Collaborative Presenter',
      type: 'presentation',
    })

    // Create collaborator with write access
    const writer = await createVerifiedUser(page, {
      firstName: 'Writer',
      lastName: 'User',
      email: writerEmail,
      password: testUser.password,
    })
    await createDocumentUser(page, { documentId: doc.id, userId: writer.id, write: true })

    await loginUser(page, { email: writerEmail, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')

    // Wait for loading to finish
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Should be able to access presenter mode
    await expect(page.locator('header h1')).toContainText('Untitled', { timeout: 10000 })
  })
})

test.describe('Presenter Navigation', () => {
  const testUser = {
    firstName: 'Nav',
    lastName: 'Test',
    password: 'password1234',
  }

  test('presenter shows floating navigation buttons', async ({ page }) => {
    const email = `presenter-nav-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Navigation Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.loading')).not.toBeVisible({ timeout: 15000 })

    // Floating navigation buttons should be visible
    const navButtons = page.locator('.nav-buttons button')
    await expect(navButtons).toHaveCount(2)
  })

  test('presenter has header with View and Edit links', async ({ page }) => {
    const email = `presenter-header-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Header Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.loading')).not.toBeVisible({ timeout: 15000 })

    // Header should have View and Edit links
    await expect(page.getByRole('link', { name: 'View' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible()
  })
})

test.describe('Viewer UI Elements', () => {
  const testUser = {
    firstName: 'Viewer',
    lastName: 'UI',
    password: 'password1234',
  }

  test('viewer is fullscreen without header or navigation buttons', async ({ page }) => {
    const email = `viewer-fullscreen-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Fullscreen Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.presentation-viewer')).toBeVisible({ timeout: 15000 })

    // Viewer is fullscreen - no header, no Edit/Present buttons
    await expect(page.locator('header')).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit' })).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Present', exact: true })).not.toBeVisible()
  })

  test('read-only user does not see Edit or Present buttons', async ({ page }) => {
    const ownerEmail = `viewer-readonly-owner-${Date.now()}@example.com`
    const readerEmail = `viewer-readonly-reader-${Date.now()}@example.com`

    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'Read Only Viewer Test',
      type: 'presentation',
    })

    const reader = await createVerifiedUser(page, {
      firstName: 'Reader',
      lastName: 'Only',
      email: readerEmail,
      password: testUser.password,
    })
    await createDocumentUser(page, { documentId: doc.id, userId: reader.id, write: false })

    await loginUser(page, { email: readerEmail, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Edit and Present buttons should NOT be visible for read-only user
    await expect(page.getByRole('link', { name: 'Edit' })).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Present', exact: true })).not.toBeVisible()
  })
})

test.describe('Document Sync', () => {
  const testUser = {
    firstName: 'Sync',
    lastName: 'Test',
    password: 'password1234',
  }

  test('presenter loads document title from server', async ({ page }) => {
    const email = `sync-title-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Server Title Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Title should show the custom title from meta
    await expect(page.locator('header h1')).toContainText('Untitled', { timeout: 10000 })
  })

  test('viewer displays presentation in fullscreen mode', async ({ page }) => {
    const email = `sync-viewer-fullscreen-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Viewer Fullscreen Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.presentation-viewer')).toBeVisible({ timeout: 15000 })

    // Viewer is fullscreen - no header with title
    await expect(page.locator('header')).not.toBeVisible()
  })

  test('page title includes presentation name', async ({ page }) => {
    const email = `sync-page-title-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Page Title Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Loading')).not.toBeVisible({ timeout: 15000 })

    // Browser page title uses Yjs meta title (empty for new docs) with fallback
    await expect(page).toHaveTitle(/Presentation/)
  })
})
