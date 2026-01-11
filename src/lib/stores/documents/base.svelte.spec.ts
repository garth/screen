import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'

// Track provider options for testing
let lastProviderOptions: {
  onConnect?: () => void
  onSynced?: (args: { state: boolean }) => void
} | null = null
let mockReadOnly = false

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
        onConnect?: () => void
        onSynced?: (args: { state: boolean }) => void
      }) {
        lastProviderOptions = options
        setTimeout(() => {
          options.onConnect?.()
          options.onSynced?.({ state: mockReadOnly })
        }, 0)
      }
    },
  }
})

import { createBaseDocument, createReactiveMetaProperty } from './base.svelte'

describe('createBaseDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastProviderOptions = null
    mockReadOnly = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a document with initial disconnected state', () => {
    const doc = createBaseDocument({ documentId: 'test-doc' })

    expect(doc.connected).toBe(false)
    expect(doc.synced).toBe(false)
    expect(doc.readOnly).toBe(true)
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
