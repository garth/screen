import { expect, test, type Page } from '@playwright/test'
import { createVerifiedUser, createDocument, createDocumentUser, loginUser } from './helpers'

test.describe('Document API Integration', () => {
  const testUser = {
    firstName: 'DocAPI',
    lastName: 'User',
    password: 'password1234',
  }

  async function createAndLoginUser(page: Page) {
    const email = `docapi-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
    const { id: userId } = await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations', { timeout: 10000 })
    return { userId, email }
  }

  async function navigateToTestPage(page: Page) {
    await page.goto('/test/documents')
    await page.waitForSelector('[data-testid="document-test-page"]')
  }

  // Helper to call testDocumentAPI methods
  async function callTestAPI<T>(page: Page, method: string, ...args: unknown[]): Promise<T> {
    return page.evaluate(
      ({ method, args }) => {
        // @ts-expect-error - window.__testDocumentAPI is exposed by test page
        const api = window.__testDocumentAPI
        if (!api) throw new Error('Test API not available')
        const fn = api[method]
        if (typeof fn !== 'function') throw new Error(`Method ${method} not found`)
        return fn(...args)
      },
      { method, args },
    )
  }

  async function waitForSync(page: Page, timeout = 10000): Promise<boolean> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      const status = await callTestAPI<{ synced: boolean }>(page, 'getStatus')
      if (status.synced) return true
      await page.waitForTimeout(100)
    }
    return false
  }

  test.describe('Presentation Documents', () => {
    test('can connect and set title', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Test Presentation',
        type: 'presentation',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'presentation', doc.id)

      const synced = await waitForSync(page)
      expect(synced).toBe(true)

      await callTestAPI(page, 'setTitle', 'My Presentation Title')
      await page.waitForTimeout(500) // Wait for sync

      const title = await callTestAPI<string>(page, 'getTitle')
      expect(title).toBe('My Presentation Title')
    })

    test('can set and get themeId', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Theme Presentation',
        type: 'presentation',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'setThemeId', 'my-theme-123')
      await page.waitForTimeout(500)

      const themeId = await callTestAPI<string | null>(page, 'getThemeId')
      expect(themeId).toBe('my-theme-123')

      // Can clear themeId
      await callTestAPI(page, 'setThemeId', null)
      await page.waitForTimeout(500)

      const clearedThemeId = await callTestAPI<string | null>(page, 'getThemeId')
      expect(clearedThemeId).toBeNull()
    })

    test('can insert and get content', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Content Presentation',
        type: 'presentation',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'insertContent', 'Hello World!')
      await page.waitForTimeout(500)

      const content = await callTestAPI<string>(page, 'getContent')
      expect(content).toBe('Hello World!')
    })

    test('data persists after reconnection', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Persistent Presentation',
        type: 'presentation',
      })

      // First connection - set data
      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'setTitle', 'Persistent Title')
      await callTestAPI(page, 'insertContent', 'Persistent Content')
      await page.waitForTimeout(1000)

      // Disconnect
      await callTestAPI(page, 'disconnect')
      await page.waitForTimeout(500)

      // Reconnect and verify
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)

      const title = await callTestAPI<string>(page, 'getTitle')
      const content = await callTestAPI<string>(page, 'getContent')

      expect(title).toBe('Persistent Title')
      expect(content).toBe('Persistent Content')
    })
  })

  test.describe('Theme Documents', () => {
    test('can set font, backgroundColor, and textColor', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Test Theme',
        type: 'theme',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'theme', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'setFont', 'Roboto')
      await callTestAPI(page, 'setBackgroundColor', '#1a1a2e')
      await callTestAPI(page, 'setTextColor', '#ffffff')
      await page.waitForTimeout(500)

      const font = await callTestAPI<string>(page, 'getFont')
      const bgColor = await callTestAPI<string>(page, 'getBackgroundColor')
      const textColor = await callTestAPI<string>(page, 'getTextColor')

      expect(font).toBe('Roboto')
      expect(bgColor).toBe('#1a1a2e')
      expect(textColor).toBe('#ffffff')
    })

    test('can set and get viewport', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Viewport Theme',
        type: 'theme',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'theme', doc.id)
      await waitForSync(page)

      const viewport = { x: 10, y: 20, width: 800, height: 600 }
      await callTestAPI(page, 'setViewport', viewport)
      await page.waitForTimeout(500)

      const result = await callTestAPI<{ x: number; y: number; width: number; height: number } | null>(
        page,
        'getViewport',
      )
      expect(result).toEqual(viewport)

      // Can clear viewport
      await callTestAPI(page, 'setViewport', undefined)
      await page.waitForTimeout(500)

      const clearedViewport = await callTestAPI<unknown>(page, 'getViewport')
      expect(clearedViewport == null).toBe(true) // Could be null or undefined
    })

    test('inherits from base theme', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)

      // Create base theme with values
      const baseTheme = await createDocument(page, {
        userId,
        name: 'Base Theme',
        type: 'theme',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'theme', baseTheme.id)
      await waitForSync(page)

      await callTestAPI(page, 'setFont', 'Arial')
      await callTestAPI(page, 'setBackgroundColor', '#000000')
      await callTestAPI(page, 'setTextColor', '#ffffff')
      await page.waitForTimeout(1000)
      await callTestAPI(page, 'disconnect')

      // Create child theme based on base
      const childTheme = await createDocument(page, {
        userId,
        name: 'Child Theme',
        type: 'theme',
        baseDocumentId: baseTheme.id,
      })

      // Connect to child - should inherit base values
      await callTestAPI(page, 'connect', 'theme', childTheme.id, baseTheme.id)
      await waitForSync(page)

      // Effective values should match base theme
      const effectiveFont = await callTestAPI<string>(page, 'getEffectiveFont')
      const effectiveBgColor = await callTestAPI<string>(page, 'getEffectiveBackgroundColor')
      const effectiveTextColor = await callTestAPI<string>(page, 'getEffectiveTextColor')

      expect(effectiveFont).toBe('Arial')
      expect(effectiveBgColor).toBe('#000000')
      expect(effectiveTextColor).toBe('#ffffff')
    })

    test('child theme overrides base theme values', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)

      // Create base theme
      const baseTheme = await createDocument(page, {
        userId,
        name: 'Base Theme Override',
        type: 'theme',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'theme', baseTheme.id)
      await waitForSync(page)

      await callTestAPI(page, 'setFont', 'Arial')
      await callTestAPI(page, 'setBackgroundColor', '#000000')
      await page.waitForTimeout(1000)
      await callTestAPI(page, 'disconnect')

      // Create child theme
      const childTheme = await createDocument(page, {
        userId,
        name: 'Child Theme Override',
        type: 'theme',
        baseDocumentId: baseTheme.id,
      })

      await callTestAPI(page, 'connect', 'theme', childTheme.id, baseTheme.id)
      await waitForSync(page)

      // Override font in child
      await callTestAPI(page, 'setFont', 'Helvetica')
      await page.waitForTimeout(500)

      // Child's own font value should be used
      const effectiveFont = await callTestAPI<string>(page, 'getEffectiveFont')
      // Base's background color should still apply
      const effectiveBgColor = await callTestAPI<string>(page, 'getEffectiveBackgroundColor')

      expect(effectiveFont).toBe('Helvetica')
      expect(effectiveBgColor).toBe('#000000')
    })
  })

  test.describe('Event Documents', () => {
    test('can add and get presentations', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Test Event',
        type: 'event',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'event', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'addPresentation', 'pres-1')
      await callTestAPI(page, 'addPresentation', 'pres-2')
      await callTestAPI(page, 'addPresentation', 'pres-3')
      await page.waitForTimeout(500)

      const presentations = await callTestAPI<string[]>(page, 'getPresentations')
      expect(presentations).toEqual(['pres-1', 'pres-2', 'pres-3'])
    })

    test('can remove presentations', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Remove Pres Event',
        type: 'event',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'event', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'addPresentation', 'pres-1')
      await callTestAPI(page, 'addPresentation', 'pres-2')
      await page.waitForTimeout(500)

      await callTestAPI(page, 'removePresentation', 'pres-1')
      await page.waitForTimeout(500)

      const presentations = await callTestAPI<string[]>(page, 'getPresentations')
      expect(presentations).toEqual(['pres-2'])
    })

    test('can reorder presentations', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Reorder Event',
        type: 'event',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'event', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'addPresentation', 'pres-1')
      await callTestAPI(page, 'addPresentation', 'pres-2')
      await callTestAPI(page, 'addPresentation', 'pres-3')
      await page.waitForTimeout(500)

      // Move pres-3 to position 0
      await callTestAPI(page, 'reorderPresentation', 'pres-3', 0)
      await page.waitForTimeout(500)

      const presentations = await callTestAPI<string[]>(page, 'getPresentations')
      expect(presentations).toEqual(['pres-3', 'pres-1', 'pres-2'])
    })

    test('can add and manage channels', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Channel Event',
        type: 'event',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'event', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'addChannel', 'Main Stage')
      await callTestAPI(page, 'addChannel', 'Secondary Stage')
      await page.waitForTimeout(500)

      const channels = await callTestAPI<{ id: string; name: string; order: number }[]>(page, 'getChannels')
      expect(channels.length).toBe(2)
      expect(channels[0].name).toBe('Main Stage')
      expect(channels[1].name).toBe('Secondary Stage')
    })

    test('can assign presentations to channels', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Channel Assignment Event',
        type: 'event',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'event', doc.id)
      await waitForSync(page)

      // Add presentations and channel
      await callTestAPI(page, 'addPresentation', 'pres-1')
      await callTestAPI(page, 'addChannel', 'Main Stage')
      await page.waitForTimeout(500)

      const channels = await callTestAPI<{ id: string; name: string }[]>(page, 'getChannels')
      const channelId = channels[0].id

      // Assign presentation to channel with theme override
      await callTestAPI(page, 'assignPresentationToChannel', channelId, 'pres-1', 'theme-override-123')
      await page.waitForTimeout(500)

      const updatedChannels = await callTestAPI<
        { id: string; presentations: { presentationId: string; themeOverrideId?: string }[] }[]
      >(page, 'getChannels')
      const mainChannel = updatedChannels.find((c) => c.id === channelId)

      expect(mainChannel?.presentations.length).toBe(1)
      expect(mainChannel?.presentations[0].presentationId).toBe('pres-1')
      expect(mainChannel?.presentations[0].themeOverrideId).toBe('theme-override-123')
    })

    test('can remove presentations from channels', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Channel Removal Event',
        type: 'event',
      })

      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'event', doc.id)
      await waitForSync(page)

      await callTestAPI(page, 'addPresentation', 'pres-1')
      await callTestAPI(page, 'addChannel', 'Stage')
      await page.waitForTimeout(500)

      const channels = await callTestAPI<{ id: string }[]>(page, 'getChannels')
      const channelId = channels[0].id

      await callTestAPI(page, 'assignPresentationToChannel', channelId, 'pres-1')
      await page.waitForTimeout(500)

      // Remove from channel
      await callTestAPI(page, 'removePresentationFromChannel', channelId, 'pres-1')
      await page.waitForTimeout(500)

      const updatedChannels = await callTestAPI<{ id: string; presentations: unknown[] }[]>(page, 'getChannels')
      const channel = updatedChannels.find((c) => c.id === channelId)
      expect(channel?.presentations.length).toBe(0)
    })
  })

  test.describe('Connection Status', () => {
    test('reports correct connection status', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Status Test Doc',
        type: 'presentation',
      })

      await navigateToTestPage(page)

      // Initially idle
      const initialStatus = await page.locator('[data-testid="status"]').textContent()
      expect(initialStatus).toContain('idle')

      // Connect
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)

      // Should show connected status
      const connectedStatus = await callTestAPI<{ status: string; connected: boolean; synced: boolean }>(
        page,
        'getStatus',
      )
      expect(connectedStatus.connected).toBe(true)
      expect(connectedStatus.synced).toBe(true)

      // Disconnect
      await callTestAPI(page, 'disconnect')
      await page.waitForTimeout(500)

      const disconnectedStatus = await callTestAPI<{ connected: boolean; synced: boolean }>(page, 'getStatus')
      expect(disconnectedStatus.connected).toBe(false)
      expect(disconnectedStatus.synced).toBe(false)
    })
  })

  test.describe('Read-Only Access', () => {
    test('shared user with read-only cannot persist modifications', async ({ page, browser }) => {
      const { userId: ownerId } = await createAndLoginUser(page)

      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Readonly Test Doc',
        type: 'presentation',
        public: false,
      })

      // Owner sets title
      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)
      await callTestAPI(page, 'setTitle', 'Owner Title')
      await page.waitForTimeout(1000)
      await callTestAPI(page, 'disconnect')

      // Create read-only user
      const email2 = `readonly-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      const { id: readOnlyUserId } = await createVerifiedUser(page, {
        firstName: 'ReadOnly',
        lastName: 'User',
        email: email2,
        password: testUser.password,
      })

      await createDocumentUser(page, {
        documentId: doc.id,
        userId: readOnlyUserId,
        write: false,
      })

      // Login as read-only user in new context
      const context2 = await browser.newContext()
      const page2 = await context2.newPage()

      await loginUser(page2, { email: email2, password: testUser.password })
      await expect(page2).toHaveURL('/presentations', { timeout: 10000 })

      // Navigate to test page and connect
      await page2.goto('/test/documents')
      await page2.waitForSelector('[data-testid="document-test-page"]')

      await callTestAPI(page2, 'connect', 'presentation', doc.id)
      await waitForSync(page2)

      // Try to modify - changes should not persist on server
      await callTestAPI(page2, 'setTitle', 'Hacked Title')
      await page2.waitForTimeout(1000) // Wait for potential sync

      await context2.close()

      // Reconnect as owner and verify title unchanged
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)

      const title = await callTestAPI<string>(page, 'getTitle')
      expect(title).toBe('Owner Title')
    })

    test('anonymous user changes do not persist on public document', async ({ page, browser }) => {
      const { userId: ownerId } = await createAndLoginUser(page)

      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Public Doc',
        type: 'presentation',
        public: true,
      })

      // Owner sets content
      await navigateToTestPage(page)
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)
      await callTestAPI(page, 'setTitle', 'Public Title')
      await page.waitForTimeout(1000)
      await callTestAPI(page, 'disconnect')

      // Anonymous user in new context (not logged in)
      const context2 = await browser.newContext()
      const page2 = await context2.newPage()

      await page2.goto('/test/documents')
      await page2.waitForSelector('[data-testid="document-test-page"]')

      await callTestAPI(page2, 'connect', 'presentation', doc.id)
      await waitForSync(page2)

      // Anonymous user tries to modify
      await callTestAPI(page2, 'setTitle', 'Anonymous Hack')
      await page2.waitForTimeout(1000)

      await context2.close()

      // Reconnect as owner and verify title unchanged
      await callTestAPI(page, 'connect', 'presentation', doc.id)
      await waitForSync(page)

      const title = await callTestAPI<string>(page, 'getTitle')
      expect(title).toBe('Public Title')
    })
  })
})
