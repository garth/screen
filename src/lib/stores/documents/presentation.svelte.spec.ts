import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'

// Control mock behavior
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
        setTimeout(() => {
          options.onConnect?.()
          options.onSynced?.({ state: mockReadOnly })
        }, 0)
      }
    },
  }
})

import { createPresentationDoc } from './presentation.svelte'

describe('createPresentationDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadOnly = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a presentation document with default values', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.connected).toBe(true)
    expect(doc.synced).toBe(true)
    expect(doc.title).toBe('')
    expect(doc.themeId).toBeNull()
    expect(doc.content).toBeInstanceOf(Y.Text)

    doc.destroy()
  })

  it('sets and gets title', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    doc.setTitle('My Presentation')
    expect(doc.title).toBe('My Presentation')

    doc.destroy()
  })

  it('sets and gets themeId', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    doc.setThemeId('theme-123')
    expect(doc.themeId).toBe('theme-123')

    doc.setThemeId(null)
    expect(doc.themeId).toBeNull()

    doc.destroy()
  })

  it('sets and gets font override', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.font).toBeUndefined()

    doc.setFont('Arial')
    expect(doc.font).toBe('Arial')

    doc.setFont(undefined)
    expect(doc.font).toBeUndefined()

    doc.destroy()
  })

  it('sets and gets backgroundColor override', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.backgroundColor).toBeUndefined()

    doc.setBackgroundColor('#ff0000')
    expect(doc.backgroundColor).toBe('#ff0000')

    doc.destroy()
  })

  it('sets and gets textColor override', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.textColor).toBeUndefined()

    doc.setTextColor('#000000')
    expect(doc.textColor).toBe('#000000')

    doc.destroy()
  })

  it('provides access to Y.Text content', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    doc.content.insert(0, 'Hello, World!')
    expect(doc.content.toString()).toBe('Hello, World!')

    doc.destroy()
  })

  it('provides access to raw ydoc and meta', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.ydoc).toBeInstanceOf(Y.Doc)
    expect(doc.meta).toBeInstanceOf(Y.Map)

    doc.destroy()
  })

  it('updates meta in Yjs when properties are set', async () => {
    const doc = createPresentationDoc({ documentId: 'test-presentation' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    doc.setTitle('Test Title')
    doc.setThemeId('theme-456')

    expect(doc.meta.get('title')).toBe('Test Title')
    expect(doc.meta.get('themeId')).toBe('theme-456')

    doc.destroy()
  })

  it('calls onMetaChange when meta is updated', async () => {
    vi.useFakeTimers()
    const onMetaChange = vi.fn()

    const doc = createPresentationDoc({
      documentId: 'test-presentation',
      onMetaChange,
    })

    await vi.advanceTimersByTimeAsync(10)

    doc.setTitle('New Title')

    await vi.advanceTimersByTimeAsync(500) // debounce

    expect(onMetaChange).toHaveBeenCalled()
    expect(onMetaChange.mock.calls[0][0]).toMatchObject({ title: 'New Title' })

    doc.destroy()
  })

  describe('readonly mode', () => {
    it('throws when setting title on readonly document', async () => {
      mockReadOnly = true

      const doc = createPresentationDoc({ documentId: 'readonly-presentation' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(doc.readOnly).toBe(true)
      expect(() => doc.setTitle('Test')).toThrow('Document is readonly')

      doc.destroy()
    })

    it('throws when setting themeId on readonly document', async () => {
      mockReadOnly = true

      const doc = createPresentationDoc({ documentId: 'readonly-presentation' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(() => doc.setThemeId('theme-123')).toThrow('Document is readonly')

      doc.destroy()
    })

    it('throws when setting font on readonly document', async () => {
      mockReadOnly = true

      const doc = createPresentationDoc({ documentId: 'readonly-presentation' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(() => doc.setFont('Arial')).toThrow('Document is readonly')

      doc.destroy()
    })

    it('throws when setting backgroundColor on readonly document', async () => {
      mockReadOnly = true

      const doc = createPresentationDoc({ documentId: 'readonly-presentation' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(() => doc.setBackgroundColor('#000')).toThrow('Document is readonly')

      doc.destroy()
    })

    it('throws when setting textColor on readonly document', async () => {
      mockReadOnly = true

      const doc = createPresentationDoc({ documentId: 'readonly-presentation' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(() => doc.setTextColor('#fff')).toThrow('Document is readonly')

      doc.destroy()
    })
  })
})
