import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'

// Mock $app/environment
vi.mock('$app/environment', () => ({
  browser: true,
}))

// Store base document ydocs for inheritance testing
const baseDocYdocs = new Map<string, Y.Doc>()

// Mock phoenix-socket
vi.mock('$lib/providers/phoenix-socket', () => ({
  getSocket: vi.fn(() => ({
    channel: vi.fn(),
    connect: vi.fn(),
  })),
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

      on(event: string, callback: (...args: unknown[]) => void) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, [])
        }
        this._listeners.get(event)!.push(callback)
      }

      constructor(_socket: unknown, topic: string, ydoc: Y.Doc) {
        // Track base documents for inheritance testing
        const docId = topic.replace('document:', '')
        if (docId.startsWith('base-')) {
          baseDocYdocs.set(docId, ydoc)
        }

        setTimeout(() => {
          for (const cb of this._listeners.get('status') ?? []) cb({ status: 'connected' })
          for (const cb of this._listeners.get('sync') ?? []) cb(true)
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
      constructor() {}
    },
  }
})

import { createThemeDoc } from './theme.svelte'
import type { ViewportArea } from './types'

describe('createThemeDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    baseDocYdocs.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a theme document with default values', async () => {
    const doc = createThemeDoc({ documentId: 'test-theme' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.connected).toBe(true)
    expect(doc.synced).toBe(true)
    expect(doc.font).toBe('')
    expect(doc.backgroundColor).toBe('')
    expect(doc.textColor).toBe('')
    expect(doc.isSystemTheme).toBe(false)
    expect(doc.viewport).toBeUndefined()
    expect(doc.backgroundImage).toBeNull()

    doc.destroy()
  })

  it('sets and gets font', async () => {
    const doc = createThemeDoc({ documentId: 'test-theme' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    doc.setFont('Roboto')
    expect(doc.font).toBe('Roboto')

    doc.destroy()
  })

  it('sets and gets backgroundColor', async () => {
    const doc = createThemeDoc({ documentId: 'test-theme' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    doc.setBackgroundColor('#ffffff')
    expect(doc.backgroundColor).toBe('#ffffff')

    doc.destroy()
  })

  it('sets and gets textColor', async () => {
    const doc = createThemeDoc({ documentId: 'test-theme' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    doc.setTextColor('#333333')
    expect(doc.textColor).toBe('#333333')

    doc.destroy()
  })

  it('sets and gets viewport', async () => {
    const doc = createThemeDoc({ documentId: 'test-theme' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    const viewport: ViewportArea = { x: 10, y: 20, width: 800, height: 600 }
    doc.setViewport(viewport)
    expect(doc.viewport).toEqual(viewport)

    doc.setViewport(undefined)
    expect(doc.viewport).toBeUndefined()

    doc.destroy()
  })

  it('sets and gets backgroundImage', async () => {
    const doc = createThemeDoc({ documentId: 'test-theme' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    const imageData = new Uint8Array([1, 2, 3, 4, 5])
    doc.setBackgroundImage(imageData)
    expect(doc.backgroundImage).toEqual(imageData)

    doc.setBackgroundImage(null)
    expect(doc.backgroundImage).toBeNull()

    doc.destroy()
  })

  describe('effective values (inheritance)', () => {
    it('returns default effective values when no base theme', async () => {
      const doc = createThemeDoc({ documentId: 'test-theme' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(doc.effectiveFont).toBe('sans-serif')
      expect(doc.effectiveBackgroundColor).toBe('#ffffff')
      expect(doc.effectiveTextColor).toBe('#000000')
      expect(doc.effectiveViewport).toBeUndefined()

      doc.destroy()
    })

    it('returns local values for effective properties when set', async () => {
      const doc = createThemeDoc({ documentId: 'test-theme' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.setFont('Arial')
      doc.setBackgroundColor('#000000')
      doc.setTextColor('#ffffff')

      expect(doc.effectiveFont).toBe('Arial')
      expect(doc.effectiveBackgroundColor).toBe('#000000')
      expect(doc.effectiveTextColor).toBe('#ffffff')

      doc.destroy()
    })

    it('inherits from base theme when local value is empty', async () => {
      // Create a theme with a base document
      const doc = createThemeDoc({
        documentId: 'child-theme',
        baseDocumentId: 'base-theme-1',
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Get the base ydoc and set values in its meta
      const baseYdoc = baseDocYdocs.get('base-theme-1')
      if (baseYdoc) {
        const baseMeta = baseYdoc.getMap('meta')
        baseMeta.set('font', 'Georgia')
        baseMeta.set('backgroundColor', '#f0f0f0')
        baseMeta.set('textColor', '#111111')
      }

      // Wait for observation to kick in
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Local values are empty, should inherit from base
      expect(doc.effectiveFont).toBe('Georgia')
      expect(doc.effectiveBackgroundColor).toBe('#f0f0f0')
      expect(doc.effectiveTextColor).toBe('#111111')

      doc.destroy()
    })

    it('prefers local value over inherited value', async () => {
      const doc = createThemeDoc({
        documentId: 'child-theme-2',
        baseDocumentId: 'base-theme-2',
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Set base values
      const baseYdoc = baseDocYdocs.get('base-theme-2')
      if (baseYdoc) {
        const baseMeta = baseYdoc.getMap('meta')
        baseMeta.set('font', 'Georgia')
        baseMeta.set('backgroundColor', '#f0f0f0')
      }

      await new Promise((resolve) => setTimeout(resolve, 20))

      // Set local value
      doc.setFont('Helvetica')

      // Font should be local, backgroundColor should be inherited
      expect(doc.effectiveFont).toBe('Helvetica')
      expect(doc.effectiveBackgroundColor).toBe('#f0f0f0')

      doc.destroy()
    })
  })

  describe('system theme protection', () => {
    it('throws when modifying a system theme', async () => {
      const doc = createThemeDoc({ documentId: 'system-theme' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Mark as system theme directly in meta
      doc.meta.set('isSystemTheme', true)

      // Wait for observation to update
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(doc.isSystemTheme).toBe(true)
      expect(() => doc.setFont('Arial')).toThrow('Cannot modify system theme')
      expect(() => doc.setBackgroundColor('#000')).toThrow('Cannot modify system theme')
      expect(() => doc.setTextColor('#fff')).toThrow('Cannot modify system theme')
      expect(() => doc.setViewport({ x: 0, y: 0, width: 100, height: 100 })).toThrow('Cannot modify system theme')
      expect(() => doc.setBackgroundImage(new Uint8Array([1]))).toThrow('Cannot modify system theme')

      doc.destroy()
    })
  })

  // Note: readonly enforcement is now done server-side, not client-side.
  // See e2e/document-api.test.ts for readonly behavior tests.

  it('provides access to raw ydoc and meta', async () => {
    const doc = createThemeDoc({ documentId: 'test-theme' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.ydoc).toBeInstanceOf(Y.Doc)
    expect(doc.meta).toBeInstanceOf(Y.Map)

    doc.destroy()
  })

  it('calls onMetaChange when meta is updated', async () => {
    vi.useFakeTimers()
    const onMetaChange = vi.fn()

    const doc = createThemeDoc({
      documentId: 'test-theme',
      onMetaChange,
    })

    await vi.advanceTimersByTimeAsync(10)

    doc.setFont('Roboto')
    doc.setBackgroundColor('#123456')

    await vi.advanceTimersByTimeAsync(500) // debounce

    expect(onMetaChange).toHaveBeenCalled()

    doc.destroy()
  })
})
