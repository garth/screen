import { expect, test } from '@playwright/test'
import { createVerifiedUser, createDocument, createDocumentUser, loginUser } from './helpers'

test.describe('Presentations List', () => {
  const testUser = {
    firstName: 'Presentation',
    lastName: 'Tester',
    password: 'password123',
  }

  test('requires authentication to view presentations list', async ({ page }) => {
    await page.goto('/presentations')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows empty state when no presentations exist', async ({ page }) => {
    const email = `pres-empty-${Date.now()}@example.com`

    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/presentations')
    await page.waitForLoadState('networkidle')

    // Should show empty state (actual text is "You don't have any presentations yet.")
    await expect(page.getByText("You don't have any presentations yet")).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'New Presentation' })).toBeVisible()
  })

  test('displays presentations in the list', async ({ page }) => {
    const email = `pres-list-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await createDocument(page, {
      userId: user.id,
      name: 'My First Presentation',
      type: 'presentation',
      meta: { title: 'My First Presentation' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/presentations')
    await page.waitForLoadState('networkidle')

    // Should display the presentation (use name since title in meta may not be used in list)
    await expect(page.getByText('My First Presentation')).toBeVisible({ timeout: 10000 })
  })

  test('creates a new presentation and redirects to edit page', async ({ page }) => {
    const email = `pres-create-${Date.now()}@example.com`

    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/presentations')
    await page.waitForLoadState('networkidle')

    // Click new presentation button
    await page.getByRole('button', { name: 'New Presentation' }).click()

    // Should redirect to edit page
    await expect(page).toHaveURL(/\/presentation\/[^/]+\/edit/, { timeout: 10000 })
  })

  test('new presentation shows generated name in editor title input', async ({ page }) => {
    const email = `pres-title-${Date.now()}@example.com`

    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/presentations')
    await page.waitForLoadState('networkidle')

    // Click new presentation button
    await page.getByRole('button', { name: 'New Presentation' }).click()

    // Should redirect to edit page
    await expect(page).toHaveURL(/\/presentation\/[^/]+\/edit/, { timeout: 10000 })

    // Wait for the editor to load and sync
    await page.waitForLoadState('networkidle')

    // The title input should have a generated name (not empty or "Untitled")
    const titleInput = page.locator('input[type="text"]').first()
    await expect(titleInput).toBeVisible({ timeout: 10000 })

    // Wait for Yjs sync and check the title is not empty
    await expect(titleInput).not.toHaveValue('', { timeout: 10000 })
    await expect(titleInput).not.toHaveValue('Untitled', { timeout: 5000 })

    // The value should be a generated name (2 words)
    const titleValue = await titleInput.inputValue()
    expect(titleValue.split(' ').length).toBeGreaterThanOrEqual(2)
  })

  test('shows shared presentations from other users', async ({ page }) => {
    const ownerEmail = `pres-owner-${Date.now()}@example.com`
    const sharedEmail = `pres-shared-${Date.now()}@example.com`

    // Create owner and their presentation
    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'Shared with Team',
      type: 'presentation',
      meta: { title: 'Shared with Team' },
    })

    // Create shared user and grant access
    const sharedUser = await createVerifiedUser(page, {
      firstName: 'Shared',
      lastName: 'User',
      email: sharedEmail,
      password: testUser.password,
    })
    await createDocumentUser(page, { documentId: doc.id, userId: sharedUser.id, write: false })

    // Login as shared user
    await loginUser(page, { email: sharedEmail, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/presentations')
    await page.waitForLoadState('networkidle')

    // Should see the shared presentation
    await expect(page.getByText('Shared with Team')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Presentation Viewer', () => {
  const testUser = {
    firstName: 'Viewer',
    lastName: 'Tester',
    password: 'password123',
  }

  test('displays fullscreen presentation without header', async ({ page }) => {
    const email = `viewer-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Test Viewer Title',
      type: 'presentation',
      meta: { title: 'Test Viewer Title' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')

    // Viewer is fullscreen - no header or footer
    await expect(page.locator('header')).not.toBeVisible()
    await expect(page.locator('.presentation-viewer')).toBeVisible({ timeout: 10000 })
  })

  test('viewer has no edit or present buttons (fullscreen mode)', async ({ page }) => {
    const email = `viewer-owner-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Owner Presentation',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')

    // Viewer is fullscreen - no Edit or Present buttons
    await expect(page.locator('.presentation-viewer')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: 'Edit' })).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Present', exact: true })).not.toBeVisible()
  })

  test('allows anonymous access to public presentations', async ({ page }) => {
    const email = `viewer-public-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Public Content',
      type: 'presentation',
      public: true,
      meta: { title: 'Public Content' },
    })

    // Access without logging in
    await page.goto(`/presentation/${doc.id}`)
    await page.waitForLoadState('networkidle')

    // Wait for loading to finish - viewer should be visible
    await expect(page.locator('.presentation-viewer')).toBeVisible({ timeout: 15000 })
  })

  test('redirects to login for private presentations when not authenticated', async ({ page }) => {
    const email = `viewer-private-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Private Presentation',
      type: 'presentation',
      public: false,
    })

    // Try to access without logging in
    await page.goto(`/presentation/${doc.id}`)

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('returns 403 for private presentations user cannot access', async ({ page }) => {
    const ownerEmail = `viewer-denied-owner-${Date.now()}@example.com`
    const otherEmail = `viewer-denied-other-${Date.now()}@example.com`

    // Create owner and private presentation
    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'Denied Presentation',
      type: 'presentation',
      public: false,
    })

    // Create another user without access
    await createVerifiedUser(page, {
      firstName: 'Other',
      lastName: 'User',
      email: otherEmail,
      password: testUser.password,
    })
    await loginUser(page, { email: otherEmail, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    // Try to access the presentation
    const response = await page.goto(`/presentation/${doc.id}`)

    // Should get 403 error
    expect(response?.status()).toBe(403)
  })
})

test.describe('Presentation Editor', () => {
  const testUser = {
    firstName: 'Editor',
    lastName: 'Tester',
    password: 'password123',
  }

  test('requires write permission to access editor', async ({ page }) => {
    const ownerEmail = `editor-owner-${Date.now()}@example.com`
    const readerEmail = `editor-reader-${Date.now()}@example.com`

    // Create owner and presentation
    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'No Edit Access',
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
    await expect(page).toHaveURL('/presentations')

    // Try to access editor
    const response = await page.goto(`/presentation/${doc.id}/edit`)

    // Should get 403 error
    expect(response?.status()).toBe(403)
  })

  test('displays editor for owner', async ({ page }) => {
    const email = `editor-display-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Editable Presentation',
      type: 'presentation',
      meta: { title: 'Original Title' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Should display title input with current title
    const titleInput = page.locator('input[type="text"]').first()
    await expect(titleInput).toBeVisible({ timeout: 10000 })
  })

  test('displays theme picker with available themes', async ({ page }) => {
    const email = `editor-themes-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })

    // Create a theme
    await createDocument(page, {
      userId: user.id,
      name: 'My Custom Theme',
      type: 'theme',
      public: false,
    })

    // Create presentation
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Presentation With Theme',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Should display theme picker (label)
    await expect(page.getByText('Theme:')).toBeVisible({ timeout: 10000 })

    // Theme picker should be visible
    const themeSelect = page.locator('select#theme-select')
    await expect(themeSelect).toBeVisible()
  })

  test('editor can be focused and accepts text input', async ({ page }) => {
    const email = `editor-focus-${Date.now()}@example.com`

    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    // Create presentation via UI to ensure proper Yjs initialization
    await page.goto('/presentations')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'New Presentation' }).click()
    await expect(page).toHaveURL(/\/presentation\/[^/]+\/edit/, { timeout: 10000 })

    // Wait for the editor to load and sync
    await page.waitForLoadState('networkidle')

    // Verify title input is visible (same check as the passing test)
    const titleInput = page.locator('input[type="text"]').first()
    await expect(titleInput).toBeVisible({ timeout: 10000 })

    // Wait for ProseMirror to initialize
    const editor = page.locator('.editor-content .ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Verify the editor has contenteditable attribute
    await expect(editor).toHaveAttribute('contenteditable', 'true')

    // Click on the editor to focus it
    await editor.click()

    // Type some text
    await page.keyboard.type('Hello, World!')

    // Verify the text appears in the editor
    await expect(editor).toContainText('Hello, World!')
  })

  test('shows Present button that links to presenter mode', async ({ page }) => {
    const email = `editor-present-link-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Present Link Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Present button should link to presenter mode (exact match to avoid "Presentations")
    const presentLink = page.getByRole('link', { name: 'Present', exact: true })
    await expect(presentLink).toBeVisible({ timeout: 10000 })
    await expect(presentLink).toHaveAttribute('href', `/presentation/${doc.id}/presenter`)
  })

  test('allows users with write access to edit', async ({ page }) => {
    const ownerEmail = `editor-collab-owner-${Date.now()}@example.com`
    const writerEmail = `editor-collab-writer-${Date.now()}@example.com`

    // Create owner and presentation
    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'Collaborative Presentation',
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
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Should be able to access editor (check for title input)
    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Presentation Presenter Mode', () => {
  const testUser = {
    firstName: 'Presenter',
    lastName: 'Tester',
    password: 'password123',
  }

  test('requires write permission to access presenter mode', async ({ page }) => {
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
    await expect(page).toHaveURL('/presentations')

    // Try to access presenter mode
    const response = await page.goto(`/presentation/${doc.id}/presenter`)

    // Should get 403 error
    expect(response?.status()).toBe(403)
  })

  test('displays presenter interface for owner', async ({ page }) => {
    const email = `presenter-display-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Presenter Title',
      type: 'presentation',
      meta: { title: 'Presenter Title' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')

    // Wait for loading to finish
    await expect(page.locator('.loading')).not.toBeVisible({ timeout: 15000 })

    // Should display title in header
    await expect(page.locator('header h1')).toContainText('Presenter Title', { timeout: 10000 })

    // Should show View and Edit links in header
    await expect(page.getByRole('link', { name: 'View' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible()
  })

  test('displays floating navigation buttons', async ({ page }) => {
    const email = `presenter-nav-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Navigation Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')

    // Should display floating navigation buttons (circular buttons with arrow icons)
    const navButtons = page.locator('.nav-buttons button')
    await expect(navButtons).toHaveCount(2, { timeout: 10000 })

    // Both buttons should be visible
    await expect(navButtons.first()).toBeVisible()
    await expect(navButtons.last()).toBeVisible()
  })

  test('allows users with write access to present', async ({ page }) => {
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
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/presenter`)
    await page.waitForLoadState('networkidle')

    // Should be able to access presenter mode (check for navigation buttons)
    await expect(page.locator('.nav-buttons button')).toHaveCount(2, { timeout: 10000 })
  })
})

test.describe('Presentation Deletion', () => {
  const testUser = {
    firstName: 'Delete',
    lastName: 'Tester',
    password: 'password123',
  }

  test('owner can delete their presentation from edit page', async ({ page }) => {
    const email = `delete-owner-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Presentation to Delete',
      type: 'presentation',
      meta: { title: 'Presentation to Delete' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Delete button should be visible
    const deleteButton = page.getByRole('button', { name: 'Delete', exact: true })
    await expect(deleteButton).toBeVisible({ timeout: 10000 })

    // Click delete to open the confirmation dialog
    await deleteButton.click()

    // Confirm dialog should appear
    const dialog = page.locator('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Delete Presentation')).toBeVisible()

    // Click the confirm delete button in the dialog
    await dialog.getByRole('button', { name: 'Delete' }).click()

    // Should redirect to presentations list
    await expect(page).toHaveURL(/\/presentations/, { timeout: 10000 })

    // Wait for the list to load
    await page.waitForLoadState('networkidle')

    // Presentation should no longer appear in the list (check within main content, not announcer)
    await expect(page.locator('main').getByText('Presentation to Delete')).not.toBeVisible({ timeout: 5000 })
  })

  test('delete can be cancelled via confirmation dialog', async ({ page }) => {
    const email = `delete-cancel-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Keep This Presentation',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Click delete to open dialog
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    // Dialog should appear
    const dialog = page.locator('dialog')
    await expect(dialog).toBeVisible()

    // Click cancel
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()

    // Should stay on edit page
    await expect(page).toHaveURL(`/presentation/${doc.id}/edit`)
  })

  test('deleted presentation returns 404', async ({ page }) => {
    const email = `delete-404-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Soon to be Deleted',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Open and confirm the delete dialog
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    const dialog = page.locator('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete' }).click()

    await expect(page).toHaveURL(/\/presentations/, { timeout: 10000 })

    // Try to access the deleted presentation
    const response = await page.goto(`/presentation/${doc.id}`)
    expect(response?.status()).toBe(404)
  })

  test('shows success toast after deletion', async ({ page }) => {
    const email = `delete-toast-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Toast Test Presentation',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/presentation/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Open and confirm delete dialog
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    const dialog = page.locator('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete' }).click()

    // Should show success toast
    await expect(page.getByText('Presentation deleted')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Presentation Delete API', () => {
  const testUser = {
    firstName: 'DeleteAPI',
    lastName: 'Tester',
    password: 'password123',
  }

  test('DELETE requires authentication', async ({ page }) => {
    const response = await page.request.delete('/api/presentations?id=some-id')
    expect(response.status()).toBe(401)
  })

  test('DELETE requires document id parameter', async ({ page }) => {
    const email = `delete-api-noid-${Date.now()}@example.com`

    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    const response = await page.request.delete('/api/presentations')
    expect(response.status()).toBe(400)
  })

  test('DELETE returns 404 for non-existent document', async ({ page }) => {
    const email = `delete-api-404-${Date.now()}@example.com`

    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    const response = await page.request.delete('/api/presentations?id=non-existent-id')
    expect(response.status()).toBe(404)
  })

  test('DELETE returns 404 for document owned by another user', async ({ page }) => {
    const ownerEmail = `delete-api-owner-${Date.now()}@example.com`
    const otherEmail = `delete-api-other-${Date.now()}@example.com`

    const owner = await createVerifiedUser(page, { ...testUser, email: ownerEmail, password: testUser.password })
    const doc = await createDocument(page, {
      userId: owner.id,
      name: 'Not Your Presentation',
      type: 'presentation',
    })

    await createVerifiedUser(page, { ...testUser, firstName: 'Other', email: otherEmail, password: testUser.password })
    await loginUser(page, { email: otherEmail, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    // Other user tries to delete owner's presentation
    const response = await page.request.delete(`/api/presentations?id=${doc.id}`)
    expect(response.status()).toBe(404)
  })

  test('DELETE returns 204 on successful deletion', async ({ page }) => {
    const email = `delete-api-success-${Date.now()}@example.com`

    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'API Delete Test',
      type: 'presentation',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    const response = await page.request.delete(`/api/presentations?id=${doc.id}`)
    expect(response.status()).toBe(204)
  })
})

test.describe('Presentation 404 Handling', () => {
  test('returns 404 for non-existent presentation', async ({ page }) => {
    const email = `404-test-${Date.now()}@example.com`

    await createVerifiedUser(page, { firstName: 'Test', lastName: 'User', email, password: 'password123' })
    await loginUser(page, { email, password: 'password123' })

    const response = await page.goto('/presentation/non-existent-id')

    expect(response?.status()).toBe(404)
  })

  test('returns 404 for non-existent presentation edit', async ({ page }) => {
    const email = `404-edit-${Date.now()}@example.com`

    await createVerifiedUser(page, { firstName: 'Test', lastName: 'User', email, password: 'password123' })
    await loginUser(page, { email, password: 'password123' })

    const response = await page.goto('/presentation/non-existent-id/edit')

    expect(response?.status()).toBe(404)
  })

  test('returns 404 for non-existent presentation presenter', async ({ page }) => {
    const email = `404-presenter-${Date.now()}@example.com`

    await createVerifiedUser(page, { firstName: 'Test', lastName: 'User', email, password: 'password123' })
    await loginUser(page, { email, password: 'password123' })

    const response = await page.goto('/presentation/non-existent-id/presenter')

    expect(response?.status()).toBe(404)
  })
})
