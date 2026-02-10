import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'

// Mock $app/environment
vi.mock('$app/environment', () => ({
  browser: true,
}))

// Store mock instances for test access
let mockDocumentsMap: Y.Map<unknown> | null = null
let mockIndexeddbSyncedCallback: (() => void) | null = null

// Mock HocuspocusProvider
vi.mock('@hocuspocus/provider', () => {
  return {
    HocuspocusProvider: class MockHocuspocusProvider {
      destroy = vi.fn()
      on = vi.fn((event: string, callback: () => void) => {
        if (event === 'synced') {
          setTimeout(callback, 0)
        }
      })

      constructor(options: {
        document: Y.Doc
        onConnect?: () => void
        onDisconnect?: () => void
        onSynced?: () => void
      }) {
        // Store reference to documents map for test manipulation
        mockDocumentsMap = options.document.getMap('documents')

        setTimeout(() => {
          options.onConnect?.()
          options.onSynced?.()
        }, 0)
      }
    },
  }
})

// Mock y-indexeddb
vi.mock('y-indexeddb', () => {
  return {
    IndexeddbPersistence: class MockIndexeddbPersistence {
      destroy = vi.fn()
      on = vi.fn((event: string, callback: () => void) => {
        if (event === 'synced') {
          mockIndexeddbSyncedCallback = callback
        }
      })
      constructor() {}
    },
  }
})

import { createDocumentListDoc, getDocumentListId } from './document-list.svelte'

describe('getDocumentListId', () => {
  it('returns correct document list ID for a user', () => {
    expect(getDocumentListId('user123')).toBe('user-user123-documents')
    expect(getDocumentListId('abc-def-ghi')).toBe('user-abc-def-ghi-documents')
  })
})

describe('createDocumentListDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentsMap = null
    mockIndexeddbSyncedCallback = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a document list with empty documents array', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(docList.connected).toBe(true)
    expect(docList.synced).toBe(true)
    expect(docList.documents).toEqual([])
    expect(docList.presentations).toEqual([])
    expect(docList.themes).toEqual([])
    expect(docList.events).toEqual([])

    docList.destroy()
  })

  it('reflects documents added to Y.Map', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    // Simulate server adding a document
    mockDocumentsMap?.set('doc-1', {
      title: 'Test Presentation',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    // Wait for Yjs observation to trigger
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(docList.documents).toHaveLength(1)
    expect(docList.documents[0]).toMatchObject({
      id: 'doc-1',
      title: 'Test Presentation',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
    })

    docList.destroy()
  })

  it('filters presentations correctly', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    mockDocumentsMap?.set('pres-1', {
      title: 'Presentation 1',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })
    mockDocumentsMap?.set('theme-1', {
      title: 'Theme 1',
      type: 'theme',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })
    mockDocumentsMap?.set('event-1', {
      title: 'Event 1',
      type: 'event',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(docList.documents).toHaveLength(3)
    expect(docList.presentations).toHaveLength(1)
    expect(docList.presentations[0].id).toBe('pres-1')
    expect(docList.themes).toHaveLength(1)
    expect(docList.themes[0].id).toBe('theme-1')
    expect(docList.events).toHaveLength(1)
    expect(docList.events[0].id).toBe('event-1')

    docList.destroy()
  })

  it('sorts documents by updatedAt descending', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    mockDocumentsMap?.set('old', {
      title: 'Old Doc',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-01T10:00:00Z',
    })
    mockDocumentsMap?.set('new', {
      title: 'New Doc',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })
    mockDocumentsMap?.set('middle', {
      title: 'Middle Doc',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-10T10:00:00Z',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(docList.documents[0].id).toBe('new')
    expect(docList.documents[1].id).toBe('middle')
    expect(docList.documents[2].id).toBe('old')

    docList.destroy()
  })

  it('updates when documents are removed from Y.Map', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    mockDocumentsMap?.set('doc-1', {
      title: 'Doc 1',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })
    mockDocumentsMap?.set('doc-2', {
      title: 'Doc 2',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(docList.documents).toHaveLength(2)

    // Remove one document
    mockDocumentsMap?.delete('doc-1')

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(docList.documents).toHaveLength(1)
    expect(docList.documents[0].id).toBe('doc-2')

    docList.destroy()
  })

  it('updates when document metadata changes', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    mockDocumentsMap?.set('doc-1', {
      title: 'Original Title',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(docList.documents[0].title).toBe('Original Title')

    // Update the document
    mockDocumentsMap?.set('doc-1', {
      title: 'Updated Title',
      type: 'presentation',
      isPublic: true,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-16T10:00:00Z',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(docList.documents[0].title).toBe('Updated Title')
    expect(docList.documents[0].isPublic).toBe(true)

    docList.destroy()
  })

  it('handles shared documents correctly', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    // Add owned and shared documents
    mockDocumentsMap?.set('owned', {
      title: 'My Doc',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })
    mockDocumentsMap?.set('shared-write', {
      title: 'Shared Write',
      type: 'presentation',
      isPublic: false,
      isOwner: false,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })
    mockDocumentsMap?.set('shared-read', {
      title: 'Shared Read Only',
      type: 'presentation',
      isPublic: false,
      isOwner: false,
      canWrite: false,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(docList.documents).toHaveLength(3)

    const owned = docList.documents.find((d) => d.id === 'owned')
    const sharedWrite = docList.documents.find((d) => d.id === 'shared-write')
    const sharedRead = docList.documents.find((d) => d.id === 'shared-read')

    expect(owned?.isOwner).toBe(true)
    expect(owned?.canWrite).toBe(true)
    expect(sharedWrite?.isOwner).toBe(false)
    expect(sharedWrite?.canWrite).toBe(true)
    expect(sharedRead?.isOwner).toBe(false)
    expect(sharedRead?.canWrite).toBe(false)

    docList.destroy()
  })

  it('syncs from IndexedDB on startup', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    // Simulate IndexedDB loading data before server sync
    mockDocumentsMap?.set('cached-doc', {
      title: 'Cached Document',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    // Trigger IndexedDB synced callback
    mockIndexeddbSyncedCallback?.()

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(docList.documents).toHaveLength(1)
    expect(docList.documents[0].title).toBe('Cached Document')

    docList.destroy()
  })

  it('destroys cleanly', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    // Should not throw
    expect(() => docList.destroy()).not.toThrow()
  })

  it('handles empty title gracefully', async () => {
    const docList = createDocumentListDoc({ userId: 'test-user' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    mockDocumentsMap?.set('no-title', {
      title: '',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(docList.documents[0].title).toBe('')

    docList.destroy()
  })
})
