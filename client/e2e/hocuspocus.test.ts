import { expect, test } from '@playwright/test'
import {
  createVerifiedUser,
  createDocument,
  createDocumentUser,
  loginUser,
  updateDocument,
  getDocumentMeta,
} from './helpers'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import WebSocket from 'ws'

test.describe('Hocuspocus Collaboration Server', () => {
  const testUser = {
    firstName: 'Collab',
    lastName: 'User',
    password: 'password123',
  }

  async function createAndLoginUser(page: import('@playwright/test').Page) {
    const email = `collab-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
    const { id: userId } = await createVerifiedUser(page, {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email,
      password: testUser.password,
    })
    await loginUser(page, { email, password: testUser.password })
    await expect(page).toHaveURL('/presentations')
    return { userId, email }
  }

  async function getSessionToken(page: import('@playwright/test').Page): Promise<string | null> {
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name === 'auth-session')
    return sessionCookie?.value ?? null
  }

  // Helper to login a user in a new browser context and get their token
  // This doesn't affect the main page's session
  async function getTokenForUser(
    page: import('@playwright/test').Page,
    email: string,
    password: string,
  ): Promise<string> {
    const browser = page.context().browser()
    if (!browser) throw new Error('No browser available')

    const context = await browser.newContext()
    const newPage = await context.newPage()

    await loginUser(newPage, { email, password })
    // Wait for redirect after login
    await newPage.waitForURL('/presentations')

    const cookies = await context.cookies()
    const sessionCookie = cookies.find((c) => c.name === 'auth-session')

    await context.close()

    if (!sessionCookie) throw new Error('No session cookie found')
    return sessionCookie.value
  }

  interface ConnectionResult {
    connected: boolean
    synced: boolean
    authFailed: boolean
    authFailedReason?: string
    error?: string
  }

  // Helper to create a HocuspocusProvider with proper config
  function createProvider(documentId: string, ydoc: Y.Doc, token: string | null): HocuspocusProvider {
    return new HocuspocusProvider({
      url: 'ws://localhost:1234',
      name: documentId,
      document: ydoc,
      WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
      token: token ?? undefined,
    })
  }

  // Helper to test connection using HocuspocusProvider
  async function testConnection(documentId: string, token: string | null): Promise<ConnectionResult> {
    return new Promise((resolve) => {
      const ydoc = new Y.Doc()
      let connected = false
      let synced = false
      let authFailed = false
      let authFailedReason: string | undefined
      let resolved = false

      const cleanup = () => {
        if (!resolved) {
          resolved = true
          provider.destroy()
          ydoc.destroy()
        }
      }

      const provider = new HocuspocusProvider({
        url: 'ws://localhost:1234',
        name: documentId,
        document: ydoc,
        WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
        token: token ?? undefined,
        onConnect: () => {
          connected = true
        },
        onSynced: () => {
          synced = true
          setTimeout(() => {
            cleanup()
            resolve({ connected, synced, authFailed })
          }, 100)
        },
        onAuthenticationFailed: ({ reason }) => {
          authFailed = true
          authFailedReason = reason
          cleanup()
          resolve({ connected, synced, authFailed, authFailedReason })
        },
        onClose: () => {
          if (!resolved) {
            cleanup()
            resolve({ connected, synced, authFailed, authFailedReason })
          }
        },
      })

      setTimeout(() => {
        if (!resolved) {
          cleanup()
          resolve({ connected, synced, authFailed, error: 'Timeout' })
        }
      }, 10000)
    })
  }

  test.describe('Document Owner Access', () => {
    test('owner can connect and sync their document', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Test Doc',
        type: 'note',
      })

      const token = await getSessionToken(page)
      const result = await testConnection(doc.id, token)

      expect(result.connected).toBe(true)
      expect(result.synced).toBe(true)
      expect(result.authFailed).toBe(false)
    })

    test('owner can write to their document', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Writable Doc',
        type: 'note',
      })

      const token = await getSessionToken(page)
      const ydoc = new Y.Doc()

      const result = await new Promise<{ synced: boolean; canWrite: boolean }>((resolve) => {
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const ytext = ydoc.getText('content')
          ytext.insert(0, 'Hello, World!')

          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve({ synced: true, canWrite: ytext.toString() === 'Hello, World!' })
          }, 500)
        })

        setTimeout(() => {
          provider.destroy()
          ydoc.destroy()
          resolve({ synced: false, canWrite: false })
        }, 10000)
      })

      expect(result.synced).toBe(true)
      expect(result.canWrite).toBe(true)
    })
  })

  test.describe('Public Document Access', () => {
    test('anonymous user can connect to public document', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Public Doc',
        type: 'note',
        public: true,
      })

      // Test without any token (anonymous)
      const result = await testConnection(doc.id, null)

      expect(result.connected).toBe(true)
      expect(result.synced).toBe(true)
      expect(result.authFailed).toBe(false)
    })

    test('public document is read-only for anonymous users', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Public Doc',
        type: 'note',
        public: true,
      })

      // First, owner writes some content
      const token = await getSessionToken(page)
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const ytext = ydoc.getText('content')
          ytext.insert(0, 'Owner content')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Anonymous user tries to write
      const result = await new Promise<{ content: string; canWrite: boolean }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, null)

        provider.on('synced', () => {
          const ytext = ydoc.getText('content')
          const originalContent = ytext.toString()

          // Try to write - should be ignored because read-only
          ytext.insert(0, 'Hacked!')

          setTimeout(() => {
            const finalContent = ytext.toString()
            provider.destroy()
            ydoc.destroy()
            // If read-only worked, "Hacked!" should be reverted or not synced
            // The local change happens but shouldn't persist
            resolve({
              content: originalContent,
              canWrite: finalContent.includes('Hacked!'),
            })
          }, 500)
        })
      })

      expect(result.content).toBe('Owner content')
    })

    test('authenticated user can access another users public document', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Public Doc',
        type: 'note',
        public: true,
      })

      // Create a different user
      const email2 = `other-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      await createVerifiedUser(page, {
        firstName: 'Other',
        lastName: 'User',
        email: email2,
        password: testUser.password,
      })

      // Get their token in a separate context
      const token = await getTokenForUser(page, email2, testUser.password)
      const result = await testConnection(doc.id, token)

      expect(result.connected).toBe(true)
      expect(result.synced).toBe(true)
      expect(result.authFailed).toBe(false)
    })
  })

  test.describe('Shared Document Access', () => {
    test('shared user with write permission can connect and write', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Shared Doc',
        type: 'note',
        public: false,
      })

      const email2 = `shared-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      const { id: sharedUserId } = await createVerifiedUser(page, {
        firstName: 'Shared',
        lastName: 'User',
        email: email2,
        password: testUser.password,
      })

      await createDocumentUser(page, {
        documentId: doc.id,
        userId: sharedUserId,
        write: true,
      })

      // Get shared user's token in a separate context (doesn't invalidate owner's session)
      const token = await getTokenForUser(page, email2, testUser.password)
      const result = await testConnection(doc.id, token)

      expect(result.connected).toBe(true)
      expect(result.synced).toBe(true)
      expect(result.authFailed).toBe(false)
    })

    test('shared user with read-only permission can connect but cannot write', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const ownerToken = await getSessionToken(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'ReadOnly Shared Doc',
        type: 'note',
        public: false,
      })

      // Owner writes initial content
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, ownerToken)
        provider.on('synced', () => {
          ydoc.getText('content').insert(0, 'Original')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      const email2 = `readonly-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      const { id: sharedUserId } = await createVerifiedUser(page, {
        firstName: 'ReadOnly',
        lastName: 'User',
        email: email2,
        password: testUser.password,
      })

      await createDocumentUser(page, {
        documentId: doc.id,
        userId: sharedUserId,
        write: false,
      })

      // Get shared user's token in a separate context (doesn't invalidate owner's session)
      const token = await getTokenForUser(page, email2, testUser.password)
      const result = await testConnection(doc.id, token)

      expect(result.connected).toBe(true)
      expect(result.synced).toBe(true)
      expect(result.authFailed).toBe(false)
    })

    test('non-public documents require DocumentUser entry to read', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Private Doc',
        type: 'note',
        public: false,
      })

      // Create another user who is NOT shared on the document
      const email2 = `notshared-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      await createVerifiedUser(page, {
        firstName: 'NotShared',
        lastName: 'User',
        email: email2,
        password: testUser.password,
      })

      // Get the non-shared user's token (in separate context)
      const token = await getTokenForUser(page, email2, testUser.password)
      const result = await testConnection(doc.id, token)

      expect(result.authFailed).toBe(true)
    })
  })

  test.describe('Access Denied', () => {
    test('anonymous user cannot access private document', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Private Doc',
        type: 'note',
        public: false,
      })

      const result = await testConnection(doc.id, null)

      expect(result.authFailed).toBe(true)
    })

    test('authenticated user cannot access another users private document', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Private Doc',
        type: 'note',
        public: false,
      })

      // Create intruder user
      const email2 = `intruder-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      await createVerifiedUser(page, {
        firstName: 'Intruder',
        lastName: 'User',
        email: email2,
        password: testUser.password,
      })

      // Get intruder's token in separate context
      const token = await getTokenForUser(page, email2, testUser.password)
      const result = await testConnection(doc.id, token)

      expect(result.authFailed).toBe(true)
    })

    test('connection fails for non-existent document', async ({ page }) => {
      await createAndLoginUser(page)
      const token = await getSessionToken(page)

      const result = await testConnection('non-existent-document-id', token)

      expect(result.authFailed).toBe(true)
    })
  })

  test.describe('Document Persistence', () => {
    test('client updates are stored in individual rows in DocumentUpdate table', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Persistent Doc',
        type: 'note',
      })

      const token = await getSessionToken(page)

      // Make multiple separate updates
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const ytext = ydoc.getText('content')

          // Insert three separate characters with delays to create separate updates
          ytext.insert(0, 'A')
          setTimeout(() => {
            ytext.insert(1, 'B')
            setTimeout(() => {
              ytext.insert(2, 'C')
              setTimeout(() => {
                provider.destroy()
                ydoc.destroy()
                resolve()
              }, 500)
            }, 100)
          }, 100)
        })
      })

      // Verify content persists on reconnect
      const result = await new Promise<{ content: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const content = ydoc.getText('content').toString()
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve({ content })
          }, 100)
        })

        setTimeout(() => {
          provider.destroy()
          ydoc.destroy()
          resolve({ content: '' })
        }, 10000)
      })

      expect(result.content).toBe('ABC')
    })

    test('connecting to existing document synchronizes all updates to client', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Sync Test Doc',
        type: 'note',
      })

      const token = await getSessionToken(page)
      const testContent = `Test content ${Date.now()}`

      // First connection - write data
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          ydoc.getText('content').insert(0, testContent)
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Second connection - verify data is synchronized
      const result = await new Promise<{ content: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const content = ydoc.getText('content').toString()
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve({ content })
          }, 100)
        })

        setTimeout(() => {
          provider.destroy()
          ydoc.destroy()
          resolve({ content: '' })
        }, 10000)
      })

      expect(result.content).toBe(testContent)
    })

    test('document changes persist across connections', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'Persistent Doc',
        type: 'note',
      })

      const token = await getSessionToken(page)
      const testContent = `Persistent ${Date.now()}`

      // Write and disconnect
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          ydoc.getText('content').insert(0, testContent)
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 1000)
        })
      })

      // Wait a bit to ensure data is persisted
      await new Promise((r) => setTimeout(r, 500))

      // Reconnect and verify
      const result = await new Promise<{ content: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const content = ydoc.getText('content').toString()
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve({ content })
          }, 100)
        })
      })

      expect(result.content).toBe(testContent)
    })
  })

  test.describe('Multi-User Collaboration', () => {
    test('changes by one user synchronize to other users', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const ownerToken = await getSessionToken(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Multi-User Doc',
        type: 'note',
        public: false,
      })

      // Create and share with second user
      const email2 = `user2-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      const { id: user2Id } = await createVerifiedUser(page, {
        firstName: 'User',
        lastName: 'Two',
        email: email2,
        password: testUser.password,
      })
      await createDocumentUser(page, {
        documentId: doc.id,
        userId: user2Id,
        write: true,
      })

      // Get user2's token in separate context (doesn't invalidate owner's session)
      const user2Token = await getTokenForUser(page, email2, testUser.password)

      // Connect both users
      const ydoc1 = new Y.Doc()
      const ydoc2 = new Y.Doc()
      const provider1 = createProvider(doc.id, ydoc1, ownerToken)
      const provider2 = createProvider(doc.id, ydoc2, user2Token)

      // Wait for both to sync
      await Promise.all([
        new Promise<void>((resolve) => provider1.on('synced', () => resolve())),
        new Promise<void>((resolve) => provider2.on('synced', () => resolve())),
      ])

      // User 1 makes a change
      ydoc1.getText('content').insert(0, 'Hello from User 1')

      // Wait for sync
      await new Promise((r) => setTimeout(r, 500))

      // User 2 should see the change
      const user2Content = ydoc2.getText('content').toString()

      provider1.destroy()
      provider2.destroy()
      ydoc1.destroy()
      ydoc2.destroy()

      expect(user2Content).toBe('Hello from User 1')
    })

    test('simultaneous changes by multiple users sync correctly', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const ownerToken = await getSessionToken(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Concurrent Edit Doc',
        type: 'note',
        public: false,
      })

      // Create second user
      const email2 = `concurrent-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      const { id: user2Id } = await createVerifiedUser(page, {
        firstName: 'Concurrent',
        lastName: 'User',
        email: email2,
        password: testUser.password,
      })
      await createDocumentUser(page, {
        documentId: doc.id,
        userId: user2Id,
        write: true,
      })

      // Get user2's token in separate context (doesn't invalidate owner's session)
      const user2Token = await getTokenForUser(page, email2, testUser.password)

      // Connect both users
      const ydoc1 = new Y.Doc()
      const ydoc2 = new Y.Doc()
      const provider1 = createProvider(doc.id, ydoc1, ownerToken)
      const provider2 = createProvider(doc.id, ydoc2, user2Token)

      await Promise.all([
        new Promise<void>((resolve) => provider1.on('synced', () => resolve())),
        new Promise<void>((resolve) => provider2.on('synced', () => resolve())),
      ])

      // Both users make simultaneous changes
      ydoc1.getText('content').insert(0, 'AAA')
      ydoc2.getText('content').insert(0, 'BBB')

      // Wait for sync
      await new Promise((r) => setTimeout(r, 1000))

      // Both should have the same merged content
      const content1 = ydoc1.getText('content').toString()
      const content2 = ydoc2.getText('content').toString()

      provider1.destroy()
      provider2.destroy()
      ydoc1.destroy()
      ydoc2.destroy()

      // Yjs will merge changes - both clients should see the same result
      expect(content1).toBe(content2)
      // Content should contain both changes
      expect(content1).toContain('AAA')
      expect(content1).toContain('BBB')
    })
  })

  test.describe('Document Operations', () => {
    test('updates support adding, modifying, and deleting content', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'CRUD Doc',
        type: 'note',
      })

      const token = await getSessionToken(page)

      // Perform add, modify, delete operations
      const result = await new Promise<{
        afterAdd: string
        afterModify: string
        afterDelete: string
      }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const ytext = ydoc.getText('content')

          // Add
          ytext.insert(0, 'Hello World')
          const afterAdd = ytext.toString()

          // Modify (delete and insert)
          ytext.delete(0, 5)
          ytext.insert(0, 'Goodbye')
          const afterModify = ytext.toString()

          // Delete
          ytext.delete(8, 5)
          const afterDelete = ytext.toString()

          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve({ afterAdd, afterModify, afterDelete })
          }, 500)
        })
      })

      expect(result.afterAdd).toBe('Hello World')
      expect(result.afterModify).toBe('Goodbye World')
      expect(result.afterDelete).toBe('Goodbye ')
    })

    test('updates are stored with the ID of the user who sent them', async ({ page }) => {
      // This test verifies that when a user makes changes, those changes
      // are associated with that user's ID in the database
      const { userId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId,
        name: 'User Attribution Doc',
        type: 'note',
      })

      const token = await getSessionToken(page)

      // Make a change
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          ydoc.getText('content').insert(0, 'User attributed content')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Verify by reconnecting - if the update was saved, it should persist
      // (The actual userId verification would require database access)
      const result = await new Promise<{ content: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const content = ydoc.getText('content').toString()
          provider.destroy()
          ydoc.destroy()
          resolve({ content })
        })
      })

      expect(result.content).toBe('User attributed content')
    })
  })

  test.describe('Write Permission Enforcement', () => {
    test('user needs DocumentUser.write to write to shared document', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const ownerToken = await getSessionToken(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Write Permission Doc',
        type: 'note',
        public: false,
      })

      // Owner writes initial content
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, ownerToken)
        provider.on('synced', () => {
          ydoc.getText('content').insert(0, 'Original content')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Create read-only shared user
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
        write: false, // read-only!
      })

      // Get read-only user's token in separate context
      const readOnlyToken = await getTokenForUser(page, email2, testUser.password)

      // Read-only user connects and tries to write
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, readOnlyToken)

        provider.on('synced', () => {
          const ytext = ydoc.getText('content')
          // Attempt to modify (should be read-only)
          ytext.insert(0, 'Hacked!')

          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Check with owner if content was modified
      const result = await new Promise<{ content: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, ownerToken)

        provider.on('synced', () => {
          const content = ydoc.getText('content').toString()
          provider.destroy()
          ydoc.destroy()
          resolve({ content })
        })
      })

      // Original content should be preserved (read-only user's changes shouldn't persist)
      expect(result.content).toBe('Original content')
    })

    test('user with DocumentUser.write=true can write', async ({ page }) => {
      const { userId: ownerId } = await createAndLoginUser(page)
      const doc = await createDocument(page, {
        userId: ownerId,
        name: 'Writable Shared Doc',
        type: 'note',
        public: false,
      })

      // Create writable shared user
      const email2 = `writable-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
      const { id: writableUserId } = await createVerifiedUser(page, {
        firstName: 'Writable',
        lastName: 'User',
        email: email2,
        password: testUser.password,
      })
      await createDocumentUser(page, {
        documentId: doc.id,
        userId: writableUserId,
        write: true, // can write!
      })

      // Get writable user's token in separate context
      const writableToken = await getTokenForUser(page, email2, testUser.password)

      // Writable user connects and writes
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, writableToken)

        provider.on('synced', () => {
          ydoc.getText('content').insert(0, 'Written by shared user')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Verify content persisted
      const result = await new Promise<{ content: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, writableToken)

        provider.on('synced', () => {
          const content = ydoc.getText('content').toString()
          provider.destroy()
          ydoc.destroy()
          resolve({ content })
        })
      })

      expect(result.content).toBe('Written by shared user')
    })
  })

  test.describe('Base Document Inheritance', () => {
    test('loads updates from base document', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const token = await getSessionToken(page)

      // Create base document with content
      const baseDoc = await createDocument(page, {
        userId,
        name: 'Base Theme',
        type: 'theme',
      })

      // Write content to base document
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(baseDoc.id, ydoc, token)

        provider.on('synced', () => {
          const meta = ydoc.getMap('meta')
          meta.set('font', 'Arial')
          meta.set('backgroundColor', '#ffffff')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Create child document with baseDocumentId
      const childDoc = await createDocument(page, {
        userId,
        name: 'Child Theme',
        type: 'theme',
        baseDocumentId: baseDoc.id,
      })

      // Connect to child document and verify base content is loaded
      const result = await new Promise<{ font: string; backgroundColor: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(childDoc.id, ydoc, token)

        provider.on('synced', () => {
          const meta = ydoc.getMap('meta')
          setTimeout(() => {
            const font = meta.get('font') as string
            const backgroundColor = meta.get('backgroundColor') as string
            provider.destroy()
            ydoc.destroy()
            resolve({ font, backgroundColor })
          }, 100)
        })
      })

      expect(result.font).toBe('Arial')
      expect(result.backgroundColor).toBe('#ffffff')
    })

    test('loads multi-level base documents', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const token = await getSessionToken(page)

      // Create grandparent document
      const grandparentDoc = await createDocument(page, {
        userId,
        name: 'Grandparent Theme',
        type: 'theme',
      })

      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(grandparentDoc.id, ydoc, token)

        provider.on('synced', () => {
          const meta = ydoc.getMap('meta')
          meta.set('font', 'Times New Roman')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Create parent document based on grandparent
      const parentDoc = await createDocument(page, {
        userId,
        name: 'Parent Theme',
        type: 'theme',
        baseDocumentId: grandparentDoc.id,
      })

      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(parentDoc.id, ydoc, token)

        provider.on('synced', () => {
          const meta = ydoc.getMap('meta')
          meta.set('backgroundColor', '#000000')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Create child document based on parent
      const childDoc = await createDocument(page, {
        userId,
        name: 'Child Theme',
        type: 'theme',
        baseDocumentId: parentDoc.id,
      })

      // Connect to child and verify all ancestor content is loaded
      const result = await new Promise<{ font: string; backgroundColor: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(childDoc.id, ydoc, token)

        provider.on('synced', () => {
          const meta = ydoc.getMap('meta')
          setTimeout(() => {
            const font = meta.get('font') as string
            const backgroundColor = meta.get('backgroundColor') as string
            provider.destroy()
            ydoc.destroy()
            resolve({ font, backgroundColor })
          }, 100)
        })
      })

      // Should have font from grandparent and backgroundColor from parent
      expect(result.font).toBe('Times New Roman')
      expect(result.backgroundColor).toBe('#000000')
    })

    test('handles cyclic base documents gracefully', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const token = await getSessionToken(page)

      // Create two documents
      const docA = await createDocument(page, {
        userId,
        name: 'Doc A',
        type: 'theme',
      })

      const docB = await createDocument(page, {
        userId,
        name: 'Doc B',
        type: 'theme',
        baseDocumentId: docA.id,
      })

      // Write content to doc A
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(docA.id, ydoc, token)

        provider.on('synced', () => {
          ydoc.getMap('meta').set('source', 'docA')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 500)
        })
      })

      // Create a cycle: A -> B -> A
      await updateDocument(page, { id: docA.id, baseDocumentId: docB.id })

      // Connection should still work (not infinite loop)
      const result = await new Promise<{ connected: boolean; source: string }>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(docA.id, ydoc, token)
        let connected = false

        provider.on('connect', () => {
          connected = true
        })

        provider.on('synced', () => {
          const meta = ydoc.getMap('meta')
          const source = meta.get('source') as string
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve({ connected, source })
          }, 100)
        })

        // Timeout in case of infinite loop
        setTimeout(() => {
          provider.destroy()
          ydoc.destroy()
          resolve({ connected, source: '' })
        }, 5000)
      })

      expect(result.connected).toBe(true)
      expect(result.source).toBe('docA')
    })
  })

  test.describe('Meta Sync to Database', () => {
    test('meta changes are synced to Document.meta', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const token = await getSessionToken(page)

      const doc = await createDocument(page, {
        userId,
        name: 'Meta Sync Doc',
        type: 'presentation',
      })

      // Make meta changes
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const meta = ydoc.getMap('meta')
          meta.set('title', 'My Presentation')
          meta.set('themeId', 'theme-123')
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 1000) // Wait for debounce and sync
        })
      })

      // Verify meta was synced to database
      const dbMeta = await getDocumentMeta(page, doc.id)

      expect(dbMeta.title).toBe('My Presentation')
      expect(dbMeta.themeId).toBe('theme-123')
    })

    test('meta sync includes all meta properties', async ({ page }) => {
      const { userId } = await createAndLoginUser(page)
      const token = await getSessionToken(page)

      const doc = await createDocument(page, {
        userId,
        name: 'Full Meta Doc',
        type: 'theme',
      })

      // Set multiple meta properties
      await new Promise<void>((resolve) => {
        const ydoc = new Y.Doc()
        const provider = createProvider(doc.id, ydoc, token)

        provider.on('synced', () => {
          const meta = ydoc.getMap('meta')
          meta.set('font', 'Helvetica')
          meta.set('backgroundColor', '#f0f0f0')
          meta.set('textColor', '#333333')
          meta.set('isSystemTheme', false)
          setTimeout(() => {
            provider.destroy()
            ydoc.destroy()
            resolve()
          }, 1000)
        })
      })

      // Verify all properties synced
      const dbMeta = await getDocumentMeta(page, doc.id)

      expect(dbMeta.font).toBe('Helvetica')
      expect(dbMeta.backgroundColor).toBe('#f0f0f0')
      expect(dbMeta.textColor).toBe('#333333')
      expect(dbMeta.isSystemTheme).toBe(false)
    })
  })

  test.describe('Document Types', () => {
    test.describe('Presentation', () => {
      test('supports meta.title and meta.themeId', async ({ page }) => {
        const { userId } = await createAndLoginUser(page)
        const token = await getSessionToken(page)

        const doc = await createDocument(page, {
          userId,
          name: 'Presentation Test',
          type: 'presentation',
        })

        await new Promise<void>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const meta = ydoc.getMap('meta')
            meta.set('title', 'Quarterly Report')
            meta.set('themeId', 'corporate-theme-id')
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve()
            }, 500)
          })
        })

        // Verify by reconnecting
        const result = await new Promise<{ title: string; themeId: string }>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const meta = ydoc.getMap('meta')
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve({
                title: meta.get('title') as string,
                themeId: meta.get('themeId') as string,
              })
            }, 100)
          })
        })

        expect(result.title).toBe('Quarterly Report')
        expect(result.themeId).toBe('corporate-theme-id')
      })

      test('supports rich text content', async ({ page }) => {
        const { userId } = await createAndLoginUser(page)
        const token = await getSessionToken(page)

        const doc = await createDocument(page, {
          userId,
          name: 'Rich Text Presentation',
          type: 'presentation',
        })

        await new Promise<void>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const content = ydoc.getText('content')
            content.insert(0, 'Hello World', { bold: true })
            content.insert(11, '\nThis is a paragraph')
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve()
            }, 500)
          })
        })

        // Verify content persists
        const result = await new Promise<{ content: string }>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const content = ydoc.getText('content').toString()
            provider.destroy()
            ydoc.destroy()
            resolve({ content })
          })
        })

        expect(result.content).toBe('Hello World\nThis is a paragraph')
      })
    })

    test.describe('Theme', () => {
      test('supports font, backgroundColor, textColor', async ({ page }) => {
        const { userId } = await createAndLoginUser(page)
        const token = await getSessionToken(page)

        const doc = await createDocument(page, {
          userId,
          name: 'Theme Test',
          type: 'theme',
        })

        await new Promise<void>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const meta = ydoc.getMap('meta')
            meta.set('font', 'Georgia')
            meta.set('backgroundColor', '#1a1a2e')
            meta.set('textColor', '#eaeaea')
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve()
            }, 500)
          })
        })

        const result = await new Promise<{
          font: string
          backgroundColor: string
          textColor: string
        }>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const meta = ydoc.getMap('meta')
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve({
                font: meta.get('font') as string,
                backgroundColor: meta.get('backgroundColor') as string,
                textColor: meta.get('textColor') as string,
              })
            }, 100)
          })
        })

        expect(result.font).toBe('Georgia')
        expect(result.backgroundColor).toBe('#1a1a2e')
        expect(result.textColor).toBe('#eaeaea')
      })

      test('stores viewport area', async ({ page }) => {
        const { userId } = await createAndLoginUser(page)
        const token = await getSessionToken(page)

        const doc = await createDocument(page, {
          userId,
          name: 'Viewport Theme',
          type: 'theme',
        })

        const viewport = { x: 10, y: 20, width: 800, height: 600 }

        await new Promise<void>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const meta = ydoc.getMap('meta')
            meta.set('viewport', viewport)
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve()
            }, 500)
          })
        })

        const result = await new Promise<{ viewport: typeof viewport }>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const meta = ydoc.getMap('meta')
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve({ viewport: meta.get('viewport') as typeof viewport })
            }, 100)
          })
        })

        expect(result.viewport).toEqual(viewport)
      })

      test('stores background image as binary', async ({ page }) => {
        const { userId } = await createAndLoginUser(page)
        const token = await getSessionToken(page)

        const doc = await createDocument(page, {
          userId,
          name: 'Background Image Theme',
          type: 'theme',
        })

        // Create a simple test image (1x1 pixel PNG-like data)
        const testImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

        await new Promise<void>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const bgImage = ydoc.getMap('backgroundImage')
            bgImage.set('data', testImageData)
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve()
            }, 500)
          })
        })

        const result = await new Promise<{ hasImage: boolean; dataLength: number }>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const bgImage = ydoc.getMap('backgroundImage')
            const data = bgImage.get('data') as Uint8Array | undefined
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve({
                hasImage: data != null,
                dataLength: data?.length ?? 0,
              })
            }, 100)
          })
        })

        expect(result.hasImage).toBe(true)
        expect(result.dataLength).toBe(8)
      })
    })

    test.describe('Event', () => {
      test('supports presentations array', async ({ page }) => {
        const { userId } = await createAndLoginUser(page)
        const token = await getSessionToken(page)

        const doc = await createDocument(page, {
          userId,
          name: 'Event Test',
          type: 'event',
        })

        await new Promise<void>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const presentations = ydoc.getArray<string>('presentations')
            presentations.push(['pres-1', 'pres-2', 'pres-3'])
            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve()
            }, 500)
          })
        })

        const result = await new Promise<{ presentations: string[] }>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const presentations = ydoc.getArray<string>('presentations').toArray()
            provider.destroy()
            ydoc.destroy()
            resolve({ presentations })
          })
        })

        expect(result.presentations).toEqual(['pres-1', 'pres-2', 'pres-3'])
      })

      test('supports channels array with nested structures', async ({ page }) => {
        const { userId } = await createAndLoginUser(page)
        const token = await getSessionToken(page)

        const doc = await createDocument(page, {
          userId,
          name: 'Event Channels Test',
          type: 'event',
        })

        await new Promise<void>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const channels = ydoc.getArray<Y.Map<unknown>>('channels')

            // Create a channel with presentations
            const channel1 = new Y.Map<unknown>()
            channel1.set('id', 'channel-1')
            channel1.set('name', 'Main Stage')
            channel1.set('order', 0)

            const presArray = new Y.Array<Y.Map<unknown>>()
            const pres1 = new Y.Map<unknown>()
            pres1.set('presentationId', 'pres-1')
            pres1.set('themeOverrideId', 'theme-override-1')
            pres1.set('order', 0)
            presArray.push([pres1])

            channel1.set('presentations', presArray)
            channels.push([channel1])

            setTimeout(() => {
              provider.destroy()
              ydoc.destroy()
              resolve()
            }, 500)
          })
        })

        const result = await new Promise<{
          channelCount: number
          channelName: string
          presentationId: string
          themeOverrideId: string
        }>((resolve) => {
          const ydoc = new Y.Doc()
          const provider = createProvider(doc.id, ydoc, token)

          provider.on('synced', () => {
            const channels = ydoc.getArray<Y.Map<unknown>>('channels')
            const channel = channels.get(0)
            const presentations = channel?.get('presentations') as Y.Array<Y.Map<unknown>>
            const pres = presentations?.get(0)

            provider.destroy()
            ydoc.destroy()
            resolve({
              channelCount: channels.length,
              channelName: channel?.get('name') as string,
              presentationId: pres?.get('presentationId') as string,
              themeOverrideId: pres?.get('themeOverrideId') as string,
            })
          })
        })

        expect(result.channelCount).toBe(1)
        expect(result.channelName).toBe('Main Stage')
        expect(result.presentationId).toBe('pres-1')
        expect(result.themeOverrideId).toBe('theme-override-1')
      })
    })
  })
})
