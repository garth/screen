import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'

// Mock $app/environment
vi.mock('$app/environment', () => ({
  browser: true,
}))

// Control mock behavior
let mockReadOnly = false

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
      destroy = vi.fn()
      awareness = {
        setLocalStateField: vi.fn(),
        getStates: vi.fn(() => new Map()),
        on: vi.fn(),
        off: vi.fn(),
      }
      constructor() {}
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

import { createEventDoc } from './event.svelte'

describe('createEventDoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadOnly = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates an event document with empty arrays', async () => {
    const doc = createEventDoc({ documentId: 'test-event' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.connected).toBe(true)
    expect(doc.synced).toBe(true)
    expect(doc.presentations).toEqual([])
    expect(doc.channels).toEqual([])

    doc.destroy()
  })

  describe('presentations', () => {
    it('adds a presentation', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addPresentation('pres-1')

      expect(doc.presentations).toEqual(['pres-1'])

      doc.destroy()
    })

    it('adds multiple presentations', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addPresentation('pres-1')
      doc.addPresentation('pres-2')
      doc.addPresentation('pres-3')

      expect(doc.presentations).toEqual(['pres-1', 'pres-2', 'pres-3'])

      doc.destroy()
    })

    it('removes a presentation', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addPresentation('pres-1')
      doc.addPresentation('pres-2')
      doc.removePresentation('pres-1')

      expect(doc.presentations).toEqual(['pres-2'])

      doc.destroy()
    })

    it('does nothing when removing non-existent presentation', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addPresentation('pres-1')
      doc.removePresentation('non-existent')

      expect(doc.presentations).toEqual(['pres-1'])

      doc.destroy()
    })

    it('reorders presentations', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addPresentation('pres-1')
      doc.addPresentation('pres-2')
      doc.addPresentation('pres-3')

      doc.reorderPresentation('pres-3', 0)

      expect(doc.presentations).toEqual(['pres-3', 'pres-1', 'pres-2'])

      doc.destroy()
    })

    it('updates presentationCount in meta', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addPresentation('pres-1')
      doc.addPresentation('pres-2')

      expect(doc.meta.get('presentationCount')).toBe(2)

      doc.destroy()
    })
  })

  describe('channels', () => {
    it('adds a channel and returns its id', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Main Stage')

      expect(channelId).toBeDefined()
      expect(doc.channels).toHaveLength(1)
      expect(doc.channels[0].name).toBe('Main Stage')
      expect(doc.channels[0].id).toBe(channelId)
      expect(doc.channels[0].order).toBe(0)
      expect(doc.channels[0].presentations).toEqual([])

      doc.destroy()
    })

    it('adds multiple channels with correct order', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addChannel('Channel 1')
      doc.addChannel('Channel 2')
      doc.addChannel('Channel 3')

      expect(doc.channels).toHaveLength(3)
      expect(doc.channels[0].order).toBe(0)
      expect(doc.channels[1].order).toBe(1)
      expect(doc.channels[2].order).toBe(2)

      doc.destroy()
    })

    it('removes a channel', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const id1 = doc.addChannel('Channel 1')
      doc.addChannel('Channel 2')

      doc.removeChannel(id1)

      expect(doc.channels).toHaveLength(1)
      expect(doc.channels[0].name).toBe('Channel 2')

      doc.destroy()
    })

    it('updates a channel name', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Old Name')

      doc.updateChannel(channelId, { name: 'New Name' })

      expect(doc.channels[0].name).toBe('New Name')

      doc.destroy()
    })

    it('reorders channels', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addChannel('Channel 1')
      doc.addChannel('Channel 2')
      const id3 = doc.addChannel('Channel 3')

      doc.reorderChannel(id3, 0)

      expect(doc.channels[0].name).toBe('Channel 3')
      expect(doc.channels[1].name).toBe('Channel 1')
      expect(doc.channels[2].name).toBe('Channel 2')

      // Order values should be updated
      expect(doc.channels[0].order).toBe(0)
      expect(doc.channels[1].order).toBe(1)
      expect(doc.channels[2].order).toBe(2)

      doc.destroy()
    })

    it('updates channelCount in meta', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      doc.addChannel('Channel 1')
      doc.addChannel('Channel 2')

      expect(doc.meta.get('channelCount')).toBe(2)

      doc.destroy()
    })
  })

  describe('channel-presentation relations', () => {
    it('assigns a presentation to a channel', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Main Stage')
      doc.addPresentation('pres-1')

      doc.assignPresentationToChannel(channelId, 'pres-1')

      expect(doc.channels[0].presentations).toHaveLength(1)
      expect(doc.channels[0].presentations[0].presentationId).toBe('pres-1')
      expect(doc.channels[0].presentations[0].order).toBe(0)

      doc.destroy()
    })

    it('assigns a presentation with theme override', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Main Stage')

      doc.assignPresentationToChannel(channelId, 'pres-1', 'theme-override-1')

      expect(doc.channels[0].presentations[0].themeOverrideId).toBe('theme-override-1')

      doc.destroy()
    })

    it('does not duplicate presentation assignment', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Main Stage')

      doc.assignPresentationToChannel(channelId, 'pres-1')
      doc.assignPresentationToChannel(channelId, 'pres-1') // duplicate

      expect(doc.channels[0].presentations).toHaveLength(1)

      doc.destroy()
    })

    it('removes a presentation from a channel', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Main Stage')
      doc.assignPresentationToChannel(channelId, 'pres-1')
      doc.assignPresentationToChannel(channelId, 'pres-2')

      doc.removePresentationFromChannel(channelId, 'pres-1')

      expect(doc.channels[0].presentations).toHaveLength(1)
      expect(doc.channels[0].presentations[0].presentationId).toBe('pres-2')

      doc.destroy()
    })

    it('sets theme override for channel presentation', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Main Stage')
      doc.assignPresentationToChannel(channelId, 'pres-1')

      doc.setChannelPresentationTheme(channelId, 'pres-1', 'new-theme')

      expect(doc.channels[0].presentations[0].themeOverrideId).toBe('new-theme')

      doc.destroy()
    })

    it('removes theme override from channel presentation', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Main Stage')
      doc.assignPresentationToChannel(channelId, 'pres-1', 'initial-theme')

      doc.setChannelPresentationTheme(channelId, 'pres-1', undefined)

      expect(doc.channels[0].presentations[0].themeOverrideId).toBeUndefined()

      doc.destroy()
    })

    it('reorders presentations within a channel', async () => {
      const doc = createEventDoc({ documentId: 'test-event' })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const channelId = doc.addChannel('Main Stage')
      doc.assignPresentationToChannel(channelId, 'pres-1')
      doc.assignPresentationToChannel(channelId, 'pres-2')
      doc.assignPresentationToChannel(channelId, 'pres-3')

      doc.reorderChannelPresentation(channelId, 'pres-3', 0)

      expect(doc.channels[0].presentations[0].presentationId).toBe('pres-3')
      expect(doc.channels[0].presentations[1].presentationId).toBe('pres-1')
      expect(doc.channels[0].presentations[2].presentationId).toBe('pres-2')

      // Order values should be updated
      expect(doc.channels[0].presentations[0].order).toBe(0)
      expect(doc.channels[0].presentations[1].order).toBe(1)
      expect(doc.channels[0].presentations[2].order).toBe(2)

      doc.destroy()
    })
  })

  // Note: readonly enforcement is now done server-side, not client-side.
  // See e2e/document-api.test.ts for readonly behavior tests.

  it('provides access to raw ydoc and meta', async () => {
    const doc = createEventDoc({ documentId: 'test-event' })

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(doc.ydoc).toBeInstanceOf(Y.Doc)
    expect(doc.meta).toBeInstanceOf(Y.Map)

    doc.destroy()
  })

  it('calls onMetaChange when meta is updated', async () => {
    vi.useFakeTimers()
    const onMetaChange = vi.fn()

    const doc = createEventDoc({
      documentId: 'test-event',
      onMetaChange,
    })

    await vi.advanceTimersByTimeAsync(10)

    doc.addPresentation('pres-1')

    await vi.advanceTimersByTimeAsync(500) // debounce

    expect(onMetaChange).toHaveBeenCalled()

    doc.destroy()
  })
})
