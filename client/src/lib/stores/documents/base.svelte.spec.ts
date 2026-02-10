import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'

// Mock $app/environment
vi.mock('$app/environment', () => ({
  browser: true,
}))

// Track provider options for testing
let _lastProviderOptions: {
  onConnect?: () => void
  onSynced?: (args: { state: boolean }) => void
} | null = null
let mockReadOnly = false

// Track WebRTC provider options
let lastWebrtcOptions: {
  roomName: string
  signaling?: string[]
  filterBcConns?: boolean
} | null = null

// Mock awareness for WebRTC
const mockWebrtcAwareness = {
  setLocalStateField: vi.fn(),
  getStates: vi.fn(() => new Map()),
  on: vi.fn(),
  off: vi.fn(),
}

// Mock HocuspocusProvider
vi.mock('@hocuspocus/provider', () => {
  return {
    HocuspocusProvider: class MockHocuspocusProvider {
      destroy = vi.fn()
      awareness = {
        setLocalStateField: vi.fn(),
        getStates: vi.fn(() => new Map()),
        on: vi.fn(),
        off: vi.fn(),
      }
      on = vi.fn((event: string, callback: () => void) => {
        if (event === 'synced') {
          setTimeout(callback, 0)
        }
      })

      constructor(options: { onConnect?: () => void; onSynced?: (args: { state: boolean }) => void }) {
        _lastProviderOptions = options
        setTimeout(() => {
          options.onConnect?.()
          options.onSynced?.({ state: mockReadOnly })
        }, 0)
      }
    },
  }
})

// Mock y-webrtc
vi.mock('y-webrtc', () => {
  return {
    WebrtcProvider: class MockWebrtcProvider {
      roomName: string
      destroy = vi.fn()
      awareness = mockWebrtcAwareness

      constructor(roomName: string, _doc: Y.Doc, options?: { signaling?: string[]; filterBcConns?: boolean }) {
        this.roomName = roomName
        lastWebrtcOptions = {
          roomName,
          signaling: options?.signaling,
          filterBcConns: options?.filterBcConns,
        }
      }
    },
  }
})

// Track IndexedDB provider options
let lastIndexeddbName: string | null = null

// Mock y-indexeddb
vi.mock('y-indexeddb', () => {
  return {
    IndexeddbPersistence: class MockIndexeddbPersistence {
      name: string
      destroy = vi.fn()

      constructor(name: string, _doc: Y.Doc) {
        this.name = name
        lastIndexeddbName = name
      }
    },
  }
})

import { createBaseDocument, createReactiveMetaProperty } from './base.svelte'

describe('createBaseDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _lastProviderOptions = null
    lastWebrtcOptions = null
    lastIndexeddbName = null
    mockReadOnly = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a document with initial disconnected state', () => {
    const doc = createBaseDocument({ documentId: 'test-doc' })

    expect(doc.connected).toBe(false)
    expect(doc.synced).toBe(false)
    expect(doc.readOnly).toBe(false) // Default to writable - server enforces readonly
    expect(doc.ydoc).toBeInstanceOf(Y.Doc)
    expect(doc.meta).toBeInstanceOf(Y.Map)

    doc.destroy()
  })

  it('updates connected state when provider connects', async () => {
    const doc = createBaseDocument({ documentId: 'test-doc' })

    // Wait for mock connection
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.connected).toBe(true)
    expect(doc.synced).toBe(true)
    expect(doc.readOnly).toBe(false)

    doc.destroy()
  })

  it('creates base document provider when baseDocumentId is provided', () => {
    const doc = createBaseDocument({
      documentId: 'test-doc',
      baseDocumentId: 'base-doc',
    })

    expect(doc.baseYdoc).toBeInstanceOf(Y.Doc)
    expect(doc.baseMeta).toBeInstanceOf(Y.Map)
    expect(doc.baseProvider).not.toBeNull()

    doc.destroy()
  })

  it('does not create base document provider without baseDocumentId', () => {
    const doc = createBaseDocument({ documentId: 'test-doc' })

    expect(doc.baseYdoc).toBeNull()
    expect(doc.baseMeta).toBeNull()
    expect(doc.baseProvider).toBeNull()

    doc.destroy()
  })

  it('calls onMetaChange when meta is updated', async () => {
    vi.useFakeTimers()
    const onMetaChange = vi.fn()

    const doc = createBaseDocument({
      documentId: 'test-doc',
      onMetaChange,
    })

    // Wait for connection
    await vi.advanceTimersByTimeAsync(10)

    // Update meta
    doc.meta.set('title', 'Test Title')

    // Wait for debounce (500ms)
    await vi.advanceTimersByTimeAsync(500)

    expect(onMetaChange).toHaveBeenCalledWith({ title: 'Test Title' })

    doc.destroy()
  })

  it('debounces onMetaChange calls', async () => {
    vi.useFakeTimers()
    const onMetaChange = vi.fn()

    const doc = createBaseDocument({
      documentId: 'test-doc',
      onMetaChange,
    })

    // Wait for connection
    await vi.advanceTimersByTimeAsync(10)

    // Multiple rapid updates
    doc.meta.set('title', 'First')
    await vi.advanceTimersByTimeAsync(100)
    doc.meta.set('title', 'Second')
    await vi.advanceTimersByTimeAsync(100)
    doc.meta.set('title', 'Third')

    // Wait for debounce
    await vi.advanceTimersByTimeAsync(500)

    // Should only be called once with final value
    expect(onMetaChange).toHaveBeenCalledTimes(1)
    expect(onMetaChange).toHaveBeenCalledWith({ title: 'Third' })

    doc.destroy()
  })

  it('cleans up on destroy', () => {
    const doc = createBaseDocument({
      documentId: 'test-doc',
      baseDocumentId: 'base-doc',
    })

    const providerDestroy = doc.provider.destroy as ReturnType<typeof vi.fn>
    const baseProviderDestroy = doc.baseProvider!.destroy as ReturnType<typeof vi.fn>

    doc.destroy()

    expect(providerDestroy).toHaveBeenCalled()
    expect(baseProviderDestroy).toHaveBeenCalled()
  })

  describe('WebRTC provider', () => {
    it('creates WebRTC provider for P2P awareness sync', () => {
      const doc = createBaseDocument({ documentId: 'test-doc' })

      expect(doc.webrtcProvider).not.toBeNull()
      expect(lastWebrtcOptions).not.toBeNull()

      doc.destroy()
    })

    it('uses document ID prefixed with "awareness-" for WebRTC room name', () => {
      const doc = createBaseDocument({ documentId: 'my-presentation-123' })

      expect(lastWebrtcOptions?.roomName).toBe('awareness-my-presentation-123')

      doc.destroy()
    })

    it('configures WebRTC with default public signaling servers', () => {
      const doc = createBaseDocument({ documentId: 'test-doc' })

      expect(lastWebrtcOptions?.signaling).toContain('wss://signaling.yjs.dev')
      expect(lastWebrtcOptions?.signaling).toContain('wss://y-webrtc-signaling-eu.herokuapp.com')
      expect(lastWebrtcOptions?.signaling).toContain('wss://y-webrtc-signaling-us.herokuapp.com')

      doc.destroy()
    })

    it('disables BroadcastChannel filtering for WebRTC', () => {
      const doc = createBaseDocument({ documentId: 'test-doc' })

      expect(lastWebrtcOptions?.filterBcConns).toBe(false)

      doc.destroy()
    })

    it('sets user awareness on WebRTC provider when user is provided', () => {
      const doc = createBaseDocument({
        documentId: 'test-doc',
        user: { id: 'user-123', name: 'Test User' },
      })

      expect(mockWebrtcAwareness.setLocalStateField).toHaveBeenCalledWith('user', {
        name: 'Test User',
        color: expect.any(String),
      })

      doc.destroy()
    })

    it('uses provided user color for WebRTC awareness', () => {
      const doc = createBaseDocument({
        documentId: 'test-doc',
        user: { id: 'user-123', name: 'Test User', color: '#ff0000' },
      })

      expect(mockWebrtcAwareness.setLocalStateField).toHaveBeenCalledWith('user', {
        name: 'Test User',
        color: '#ff0000',
      })

      doc.destroy()
    })

    it('generates consistent color from user ID when not provided', () => {
      const doc1 = createBaseDocument({
        documentId: 'test-doc-1',
        user: { id: 'same-user-id', name: 'User 1' },
      })

      const firstCall = mockWebrtcAwareness.setLocalStateField.mock.calls[0]
      const firstColor = firstCall[1].color

      doc1.destroy()
      vi.clearAllMocks()

      const doc2 = createBaseDocument({
        documentId: 'test-doc-2',
        user: { id: 'same-user-id', name: 'User 2' },
      })

      const secondCall = mockWebrtcAwareness.setLocalStateField.mock.calls[0]
      const secondColor = secondCall[1].color

      // Same user ID should generate same color
      expect(firstColor).toBe(secondColor)

      doc2.destroy()
    })

    it('cleans up WebRTC provider on destroy', () => {
      const doc = createBaseDocument({ documentId: 'test-doc' })

      const webrtcDestroy = doc.webrtcProvider!.destroy as ReturnType<typeof vi.fn>

      doc.destroy()

      expect(webrtcDestroy).toHaveBeenCalled()
    })
  })

  describe('IndexedDB persistence', () => {
    it('creates IndexedDB provider for offline persistence', () => {
      const doc = createBaseDocument({ documentId: 'test-doc' })

      expect(lastIndexeddbName).not.toBeNull()

      doc.destroy()
    })

    it('uses document ID prefixed with "doc-" for IndexedDB name', () => {
      const doc = createBaseDocument({ documentId: 'my-presentation-456' })

      expect(lastIndexeddbName).toBe('doc-my-presentation-456')

      doc.destroy()
    })

    it('creates unique IndexedDB store per document', () => {
      const doc1 = createBaseDocument({ documentId: 'doc-a' })
      const firstName = lastIndexeddbName

      doc1.destroy()

      const doc2 = createBaseDocument({ documentId: 'doc-b' })
      const secondName = lastIndexeddbName

      expect(firstName).toBe('doc-doc-a')
      expect(secondName).toBe('doc-doc-b')
      expect(firstName).not.toBe(secondName)

      doc2.destroy()
    })
  })
})

describe('createReactiveMetaProperty', () => {
  it('returns default value initially', () => {
    const ydoc = new Y.Doc()
    const meta = ydoc.getMap('meta')

    const prop = createReactiveMetaProperty(meta, 'title', 'Default')

    expect(prop.get()).toBe('Default')

    ydoc.destroy()
  })

  it('returns existing value from meta', () => {
    const ydoc = new Y.Doc()
    const meta = ydoc.getMap('meta')
    meta.set('title', 'Existing')

    const prop = createReactiveMetaProperty(meta, 'title', 'Default')

    expect(prop.get()).toBe('Existing')

    ydoc.destroy()
  })

  it('updates meta when set is called', () => {
    const ydoc = new Y.Doc()
    const meta = ydoc.getMap('meta')

    const prop = createReactiveMetaProperty(meta, 'title', 'Default')
    prop.set('New Value')

    expect(meta.get('title')).toBe('New Value')

    ydoc.destroy()
  })

  it('updates value when meta changes after subscribe', () => {
    const ydoc = new Y.Doc()
    const meta = ydoc.getMap('meta')

    const prop = createReactiveMetaProperty(meta, 'title', 'Default')
    prop.subscribe()

    meta.set('title', 'Updated')

    expect(prop.get()).toBe('Updated')

    ydoc.destroy()
  })

  it('only subscribes once even if called multiple times', () => {
    const ydoc = new Y.Doc()
    const meta = ydoc.getMap('meta')

    const prop = createReactiveMetaProperty(meta, 'title', 'Default')

    // Multiple subscribe calls
    prop.subscribe()
    prop.subscribe()
    prop.subscribe()

    // Should still work correctly
    meta.set('title', 'Updated')
    expect(prop.get()).toBe('Updated')

    ydoc.destroy()
  })

  it('handles undefined values correctly', () => {
    const ydoc = new Y.Doc()
    const meta = ydoc.getMap('meta')

    const prop = createReactiveMetaProperty<string | undefined>(meta, 'optional', undefined)
    prop.subscribe()

    expect(prop.get()).toBeUndefined()

    prop.set('Value')
    expect(prop.get()).toBe('Value')

    ydoc.destroy()
  })

  it('handles null values correctly', () => {
    const ydoc = new Y.Doc()
    const meta = ydoc.getMap('meta')

    const prop = createReactiveMetaProperty<string | null>(meta, 'nullable', null)
    prop.subscribe()

    expect(prop.get()).toBeNull()

    prop.set('Value')
    expect(prop.get()).toBe('Value')

    prop.set(null)
    expect(prop.get()).toBeNull()

    ydoc.destroy()
  })
})
