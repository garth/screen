import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'

// Mock $app/environment
vi.mock('$app/environment', () => ({
  browser: true,
}))

// Mock PhoenixChannelProvider
vi.mock('y-phoenix-channel', () => {
  return {
    PhoenixChannelProvider: class MockPhoenixChannelProvider {
      destroy = vi.fn()
      awareness = {
        setLocalStateField: vi.fn(),
        getStates: vi.fn(() => new Map()),
        on: vi.fn(),
        off: vi.fn(),
      }
      _listeners = new Map<string, Array<(...args: unknown[]) => void>>()
      _channelListeners = new Map<string, Array<(...args: unknown[]) => void>>()

      channel = {
        on: (event: string, callback: (...args: unknown[]) => void) => {
          if (!this._channelListeners.has(event)) {
            this._channelListeners.set(event, [])
          }
          this._channelListeners.get(event)!.push(callback)
        },
        _emit: (event: string, payload: unknown) => {
          for (const cb of this._channelListeners.get(event) ?? []) cb(payload)
        },
      }

      on(event: string, callback: (...args: unknown[]) => void) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, [])
        }
        this._listeners.get(event)!.push(callback)
      }

      constructor() {
        setTimeout(() => {
          for (const cb of this._listeners.get('status') ?? []) cb({ status: 'connected' })
          for (const cb of this._listeners.get('sync') ?? []) cb(true)
        }, 0)
      }
    },
  }
})

// Mock phoenix-socket
vi.mock('$lib/providers/phoenix-socket', () => ({
  getSocket: vi.fn(() => ({
    channel: vi.fn(),
    connect: vi.fn(),
  })),
}))

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
    lastIndexeddbName = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a document with initial disconnected state', () => {
    const doc = createBaseDocument({ documentId: 'test-doc' })

    expect(doc.connected).toBe(false)
    expect(doc.synced).toBe(false)
    expect(doc.readOnly).toBe(false)
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

  it('updates readOnly when server pushes permissions event', async () => {
    const doc = createBaseDocument({ documentId: 'test-doc' })

    // Wait for mock connection
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.readOnly).toBe(false)

    // Simulate server pushing permissions event
    const provider = doc.provider as unknown as { channel: { _emit: (event: string, payload: unknown) => void } }
    provider.channel._emit('permissions', { read_only: true })

    expect(doc.readOnly).toBe(true)

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

  it('sets user awareness on provider when user is provided', async () => {
    const doc = createBaseDocument({
      documentId: 'test-doc',
      user: { id: 'user-123', name: 'Test User' },
    })

    expect(doc.provider.awareness.setLocalStateField).toHaveBeenCalledWith('user', {
      name: 'Test User',
      color: expect.any(String),
    })

    doc.destroy()
  })

  it('uses provided user color for awareness', () => {
    const doc = createBaseDocument({
      documentId: 'test-doc',
      user: { id: 'user-123', name: 'Test User', color: '#ff0000' },
    })

    expect(doc.provider.awareness.setLocalStateField).toHaveBeenCalledWith('user', {
      name: 'Test User',
      color: '#ff0000',
    })

    doc.destroy()
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
