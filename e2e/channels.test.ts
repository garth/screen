import { expect, test } from '@playwright/test'
import { createVerifiedUser, createDocument, createChannel, loginUser } from './helpers'

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

  test('anonymous user can view a public channel with presentation', async ({ page }) => {
    const email = `channel-view-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, {
      firstName: 'Channel',
      lastName: 'Tester',
      email,
      password: 'password1234',
    })

    // Create event (public) and presentation (public) via API
    const event = await createDocument(page, {
      userId: user.id,
      name: 'Channel Test Event',
      type: 'event',
      public: true,
      meta: { title: 'Channel Test Event' },
    })

    const presentation = await createDocument(page, {
      userId: user.id,
      name: 'Channel Presentation',
      type: 'presentation',
      public: true,
      meta: { title: 'Channel Presentation' },
    })

    // Create DB channel with slug
    const channelSlug = `test-channel-${Date.now()}`
    await createChannel(page, {
      userId: user.id,
      eventDocumentId: event.id,
      name: 'Main Stage',
      slug: channelSlug,
    })

    // Log in and set up the event via the UI
    await loginUser(page, { email, password: 'password1234' })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })

    // Navigate to event editor
    await page.goto(`/event/${event.id}/edit`)
    await page.waitForLoadState('networkidle')

    // Wait for editor to load
    await expect(page.getByRole('heading', { name: 'Presentations' })).toBeVisible({ timeout: 15000 })

    // Add the presentation to the event
    const addPresentationSelect = page.locator('select').first()
    await addPresentationSelect.selectOption(presentation.id)

    // Wait for it to appear in the list
    await expect(page.getByText('Channel Presentation')).toBeVisible({ timeout: 5000 })

    // Add a channel with matching name
    await page.locator('input[placeholder="Channel name"]').fill('Main Stage')
    await page.getByRole('button', { name: 'Add Channel' }).click()

    // Wait for channel to appear
    await expect(page.getByText('Main Stage').first()).toBeVisible({ timeout: 5000 })

    // Assign the presentation to the channel
    const assignSelect = page.locator('select').last()
    await assignSelect.selectOption(presentation.id)

    // Wait for assignment to sync
    await page.waitForTimeout(1000)

    // Now test the channel view as anonymous user (new context)
    const context = await page.context().browser()!.newContext()
    const anonPage = await context.newPage()

    await anonPage.goto(`/channel/${channelSlug}`)

    // Should eventually show the presentation viewer (not an error)
    // The viewer renders presentation content or shows a loading state
    await expect(anonPage.getByText(/not found|failed to load|no presentation/i)).not.toBeVisible({ timeout: 20000 })

    // The page title should update to reflect the presentation
    await expect(anonPage).toHaveTitle(/Channel/, { timeout: 20000 })

    await anonPage.close()
    await context.close()
  })

  test('anonymous user cannot view private channel', async ({ page }) => {
    const email = `channel-private-${Date.now()}@example.com`
    const user = await createVerifiedUser(page, {
      firstName: 'Private',
      lastName: 'Channel',
      email,
      password: 'password1234',
    })

    // Create private event
    const event = await createDocument(page, {
      userId: user.id,
      name: 'Private Event',
      type: 'event',
      public: false,
    })

    // Create DB channel pointing to private event
    const channelSlug = `private-channel-${Date.now()}`
    await createChannel(page, {
      userId: user.id,
      eventDocumentId: event.id,
      name: 'Private Stage',
      slug: channelSlug,
    })

    // Visit as anonymous user
    await page.goto(`/channel/${channelSlug}`)
    await page.waitForLoadState('networkidle')

    // Should show not found error
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 })
  })
})
