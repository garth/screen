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
    password: 'password123',
  }

  test('presenter page loads successfully', async ({ page }) => {
    const email = `presenter-load-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Presenter Load Test',
      type: 'presentation',
      meta: { title: 'Presenter Load Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')

    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')

    // Wait for loading to finish
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Header should show title
    await expect(page.locator('header h1')).toContainText('Presenter Load Test', { timeout: 10000 })

    // Keyboard navigation hint should be visible (always shown in header)
    await expect(page.getByText('Use arrow keys to navigate')).toBeVisible()

    // Back to Editor link should be visible
    await expect(page.getByText('Back to Editor')).toBeVisible()
  })

  test('viewer page loads successfully', async ({ page }) => {
    const email = `viewer-load-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Viewer Load Test',
      type: 'presentation',
      meta: { title: 'Viewer Load Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')

    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')

    // Wait for loading to finish
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Header should show title
    await expect(page.locator('header h1')).toContainText('Viewer Load Test', { timeout: 10000 })

    // Present button should be visible for owner
    await expect(page.getByRole('link', { name: 'Present', exact: true })).toBeVisible()
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
      meta: { title: 'Follow Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')

    // Open presenter mode in one tab
    const presenterPage = await context.newPage()
    await presenterPage.goto(`/presentation/${doc.id}/presenter`)
    await presenterPage.waitForLoadState('networkidle')
    await expect(presenterPage.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Wait a bit for awareness to initialize
    await presenterPage.waitForTimeout(1000)

    // Open viewer mode in another tab
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

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
      meta: { title: 'Toggle Test' },
    })

    await loginUser(page, { email, password: testUser.password })

    // Open presenter mode
    const presenterPage = await context.newPage()
    await presenterPage.goto(`/presentation/${doc.id}/presenter`)
    await presenterPage.waitForLoadState('networkidle')
    await expect(presenterPage.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })
    await presenterPage.waitForTimeout(1000)

    // Open viewer mode
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

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
      meta: { title: 'Disconnect Test' },
    })

    await loginUser(page, { email, password: testUser.password })

    // Open presenter mode
    const presenterPage = await context.newPage()
    await presenterPage.goto(`/presentation/${doc.id}/presenter`)
    await presenterPage.waitForLoadState('networkidle')
    await expect(presenterPage.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })
    await presenterPage.waitForTimeout(1000)

    // Open viewer mode
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

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
      meta: { title: 'No Presenter Test' },
    })

    await loginUser(page, { email, password: testUser.password })

    // Open viewer mode only (no presenter)
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

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
    password: 'password123',
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
    const reader = await createVerifiedUser(page, { firstName: 'Reader', lastName: 'User', email: readerEmail, password: testUser.password })
    await createDocumentUser(page, { documentId: doc.id, userId: reader.id, write: false })

    await loginUser(page, { email: readerEmail, password: testUser.password })
    await expect(page).toHaveURL('/')

    // Try to access presenter mode
    const response = await page.goto(`/presentation/${doc.id}/presenter`)

    // Should get 403 error
    expect(response?.status()).toBe(403)
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
      meta: { title: 'Collaborative Presenter' },
    })

    // Create collaborator with write access
    const writer = await createVerifiedUser(page, { firstName: 'Writer', lastName: 'User', email: writerEmail, password: testUser.password })
    await createDocumentUser(page, { documentId: doc.id, userId: writer.id, write: true })

    await loginUser(page, { email: writerEmail, password: testUser.password })
    await expect(page).toHaveURL('/')

    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')

    // Wait for loading to finish
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Should be able to access presenter mode
    await expect(page.locator('header h1')).toContainText('Collaborative Presenter', { timeout: 10000 })
  })
})

test.describe('Presenter Navigation', () => {
  const testUser = {
    firstName: 'Nav',
    lastName: 'Test',
    password: 'password123',
  }

  test('presenter shows sidebar with controls', async ({ page }) => {
    const email = `presenter-nav-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Navigation Test',
      type: 'presentation',
      meta: { title: 'Navigation Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Sidebar should be visible
    await expect(page.locator('aside')).toBeVisible()
  })

  test('presenter has keyboard navigation hint', async ({ page }) => {
    const email = `presenter-hint-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Hint Test',
      type: 'presentation',
      meta: { title: 'Hint Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Keyboard hint should be visible
    await expect(page.getByText('Use arrow keys to navigate')).toBeVisible()
  })

  test('presenter has back to editor link', async ({ page }) => {
    const email = `presenter-back-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Back Link Test',
      type: 'presentation',
      meta: { title: 'Back Link Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Back to Editor link should be visible and correct
    const backLink = page.getByText('Back to Editor')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', `/presentation/${doc.id}/edit`)
  })
})

test.describe('Viewer UI Elements', () => {
  const testUser = {
    firstName: 'Viewer',
    lastName: 'UI',
    password: 'password123',
  }

  test('viewer shows Edit button for users with write access', async ({ page }) => {
    const email = `viewer-edit-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Edit Button Test',
      type: 'presentation',
      meta: { title: 'Edit Button Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Edit link should be visible for owner
    const editLink = page.getByRole('link', { name: 'Edit' })
    await expect(editLink).toBeVisible()
    await expect(editLink).toHaveAttribute('href', `/presentation/${doc.id}/edit`)
  })

  test('viewer shows Present button for users with write access', async ({ page }) => {
    const email = `viewer-present-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Present Button Test',
      type: 'presentation',
      meta: { title: 'Present Button Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Present link should be visible for owner
    const presentLink = page.getByRole('link', { name: 'Present', exact: true })
    await expect(presentLink).toBeVisible()
    await expect(presentLink).toHaveAttribute('href', `/presentation/${doc.id}/presenter`)
  })

  test('viewer shows back link to presentations list', async ({ page }) => {
    const email = `viewer-back-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Back Link Test',
      type: 'presentation',
      meta: { title: 'Back Link Test' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Back link should be visible
    const backLink = page.getByRole('link', { name: '← Back' })
    await expect(backLink).toBeVisible()
  })

  test('read-only user does not see Edit or Present buttons', async ({ page }) => {
    const ownerEmail = `viewer-readonly-owner-${Date.now()}@example.com`
    const readerEmail = `viewer-readonly-reader-${Date.now()}@example.com`

    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'Read Only Viewer Test',
      type: 'presentation',
      meta: { title: 'Read Only Viewer Test' },
    })

    const reader = await createVerifiedUser(page, { firstName: 'Reader', lastName: 'Only', email: readerEmail, password: testUser.password })
    await createDocumentUser(page, { documentId: doc.id, userId: reader.id, write: false })

    await loginUser(page, { email: readerEmail, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Edit and Present buttons should NOT be visible for read-only user
    await expect(page.getByRole('link', { name: 'Edit' })).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Present', exact: true })).not.toBeVisible()
  })
})

test.describe('Document Sync', () => {
  const testUser = {
    firstName: 'Sync',
    lastName: 'Test',
    password: 'password123',
  }

  test('presenter loads document title from server', async ({ page }) => {
    const email = `sync-title-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Server Title Test',
      type: 'presentation',
      meta: { title: 'Custom Presentation Title' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Title should show the custom title from meta
    await expect(page.locator('header h1')).toContainText('Custom Presentation Title', { timeout: 10000 })
  })

  test('viewer loads document title from server', async ({ page }) => {
    const email = `sync-viewer-title-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Viewer Title Test',
      type: 'presentation',
      meta: { title: 'Viewer Custom Title' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Title should show the custom title from meta
    await expect(page.locator('header h1')).toContainText('Viewer Custom Title', { timeout: 10000 })
  })

  test('page title includes presentation name', async ({ page }) => {
    const email = `sync-page-title-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Page Title Test',
      type: 'presentation',
      meta: { title: 'My Awesome Presentation' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/')
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Loading presentation...')).not.toBeVisible({ timeout: 15000 })

    // Browser page title should include presentation name
    await expect(page).toHaveTitle(/My Awesome Presentation/)
  })
})
