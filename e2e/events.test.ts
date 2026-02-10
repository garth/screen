import { expect, test } from '@playwright/test'
import { createVerifiedUser, createDocument, loginUser } from './helpers'

test.describe('Events List', () => {
  const testUser = {
    firstName: 'Event',
    lastName: 'Tester',
    password: 'password123',
  }

  test('requires authentication to view events list', async ({ page }) => {
    await page.goto('/events')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows empty state when no events exist', async ({ page }) => {
    const email = `event-empty-${Date.now()}@example.com`
    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText("You don't have any events yet")).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'New Event' })).toBeVisible()
  })

  test('creates a new event and redirects to edit page', async ({ page }) => {
    const email = `event-create-${Date.now()}@example.com`
    await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'New Event' }).click()
    await expect(page).toHaveURL(/\/event\/[^/]+\/edit/, { timeout: 10000 })
  })

  test('displays events in the list', async ({ page }) => {
    const email = `event-list-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    await createDocument(page, {
      userId: user.id,
      name: 'My Sunday Event',
      type: 'event',
      meta: { title: 'My Sunday Event' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto('/events')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('My Sunday Event')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Event Editor', () => {
  const testUser = {
    firstName: 'EventEdit',
    lastName: 'Tester',
    password: 'password123',
  }

  test('displays editor for owner with title input', async ({ page }) => {
    const email = `event-edit-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Editable Event',
      type: 'event',
      meta: { title: 'Editable Event' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/event/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    const titleInput = page.locator('input[type="text"]').first()
    await expect(titleInput).toBeVisible({ timeout: 10000 })
  })

  test('shows Presentations and Channels sections', async ({ page }) => {
    const email = `event-sections-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Sections Event',
      type: 'event',
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/event/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Presentations' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible()
  })

  test('owner can delete event from edit page', async ({ page }) => {
    const email = `event-delete-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, { ...testUser, email, password: testUser.password })
    const doc = await createDocument(page, {
      userId: user.id,
      name: 'Event to Delete',
      type: 'event',
      meta: { title: 'Event to Delete' },
    })

    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')

    await page.goto(`/event/${doc.id}/edit`)
    await page.waitForLoadState('networkidle')

    const deleteButton = page.getByRole('button', { name: 'Delete', exact: true })
    await expect(deleteButton).toBeVisible({ timeout: 10000 })
    await deleteButton.click()

    // Confirm dialog
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete' }).click()

    await expect(page).toHaveURL(/\/events/, { timeout: 10000 })
  })
})
