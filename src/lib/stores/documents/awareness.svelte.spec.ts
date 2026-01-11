import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import type { WebrtcProvider } from 'y-webrtc'
import { createPresentationAwareness, type PresenterState, type DualProviders } from './awareness.svelte'

// Create a mock awareness object
function createMockAwareness() {
  const states = new Map<number, Record<string, unknown>>()
  const listeners = new Map<string, Set<() => void>>()

  return {
    states,
    setLocalStateField: vi.fn((field: string, value: unknown) => {
      const currentState = states.get(0) || {}
      if (value === null) {
        delete currentState[field]
      } else {
        currentState[field] = value
      }
      states.set(0, currentState)
      // Trigger change listeners
      listeners.get('change')?.forEach((cb) => cb())
    }),
    getStates: vi.fn(() => states),
    on: vi.fn((event: string, callback: () => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(callback)
    }),
    off: vi.fn((event: string, callback: () => void) => {
      listeners.get(event)?.delete(callback)
    }),
    // Helper to simulate remote updates
    _simulateRemoteUpdate: (clientId: number, state: Record<string, unknown>) => {
      states.set(clientId, state)
      listeners.get('change')?.forEach((cb) => cb())
    },
    _clearRemote: (clientId: number) => {
      states.delete(clientId)
      listeners.get('change')?.forEach((cb) => cb())
    },
  }
}

// Create mock dual providers
function createMockDualProviders(
  hocuspocusAwareness = createMockAwareness(),
  webrtcAwareness = createMockAwareness(),
): {
  providers: DualProviders
  hocuspocusAwareness: ReturnType<typeof createMockAwareness>
  webrtcAwareness: ReturnType<typeof createMockAwareness>
} {
  return {
    providers: {
      hocuspocus: { awareness: hocuspocusAwareness } as unknown as HocuspocusProvider,
      webrtc: { awareness: webrtcAwareness } as unknown as WebrtcProvider,
    },
    hocuspocusAwareness,
    webrtcAwareness,
  }
}

describe('createPresentationAwareness', () => {
  let hocuspocusAwareness: ReturnType<typeof createMockAwareness>
  let webrtcAwareness: ReturnType<typeof createMockAwareness>
  let providers: DualProviders
  let awareness: ReturnType<typeof createPresentationAwareness>

  beforeEach(() => {
    vi.clearAllMocks()
    const mocks = createMockDualProviders()
    providers = mocks.providers
    hocuspocusAwareness = mocks.hocuspocusAwareness
    webrtcAwareness = mocks.webrtcAwareness
    awareness = createPresentationAwareness(providers)
  })

  describe('setPresenter', () => {
    it('sets presenter state on both providers', () => {
      awareness.setPresenter('seg-123')

      expect(hocuspocusAwareness.setLocalStateField).toHaveBeenCalledWith(
        'presenter',
        expect.objectContaining({
          segmentId: 'seg-123',
          isPresenting: true,
          timestamp: expect.any(Number),
        }),
      )
      expect(webrtcAwareness.setLocalStateField).toHaveBeenCalledWith(
        'presenter',
        expect.objectContaining({
          segmentId: 'seg-123',
          isPresenting: true,
          timestamp: expect.any(Number),
        }),
      )
    })

    it('uses the same timestamp for both providers', () => {
      awareness.setPresenter('seg-123')

      const hocuspocusCall = hocuspocusAwareness.setLocalStateField.mock.calls[0][1] as PresenterState
      const webrtcCall = webrtcAwareness.setLocalStateField.mock.calls[0][1] as PresenterState

      expect(hocuspocusCall.timestamp).toBe(webrtcCall.timestamp)
    })

    it('updates timestamp on each call', async () => {
      awareness.setPresenter('seg-1')
      const firstCall = hocuspocusAwareness.setLocalStateField.mock.calls[0][1] as PresenterState
      const firstTimestamp = firstCall.timestamp

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 5))

      awareness.setPresenter('seg-2')
      const secondCall = hocuspocusAwareness.setLocalStateField.mock.calls[1][1] as PresenterState
      const secondTimestamp = secondCall.timestamp

      expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp)
    })
  })

  describe('clearPresenter', () => {
    it('clears presenter state on both providers', () => {
      awareness.setPresenter('seg-123')
      awareness.clearPresenter()

      expect(hocuspocusAwareness.setLocalStateField).toHaveBeenLastCalledWith('presenter', null)
      expect(webrtcAwareness.setLocalStateField).toHaveBeenLastCalledWith('presenter', null)
    })
  })

  describe('getActivePresenter', () => {
    it('returns null when no presenter is active on either provider', () => {
      const result = awareness.getActivePresenter()

      expect(result).toBeNull()
    })

    it('returns null when awareness is unavailable on both providers', () => {
      const nullProviders: DualProviders = {
        hocuspocus: { awareness: null } as unknown as HocuspocusProvider,
        webrtc: { awareness: null } as unknown as WebrtcProvider,
      }
      const awarenessWithNullProviders = createPresentationAwareness(nullProviders)

      const result = awarenessWithNullProviders.getActivePresenter()

      expect(result).toBeNull()
    })

    it('returns presenter from hocuspocus when only hocuspocus has presenter', () => {
      const presenterState: PresenterState = {
        segmentId: 'seg-abc',
        isPresenting: true,
        timestamp: Date.now(),
      }
      hocuspocusAwareness._simulateRemoteUpdate(1, { presenter: presenterState })

      const result = awareness.getActivePresenter()

      expect(result).toEqual(presenterState)
    })

    it('returns presenter from webrtc when only webrtc has presenter', () => {
      const presenterState: PresenterState = {
        segmentId: 'seg-xyz',
        isPresenting: true,
        timestamp: Date.now(),
      }
      webrtcAwareness._simulateRemoteUpdate(1, { presenter: presenterState })

      const result = awareness.getActivePresenter()

      expect(result).toEqual(presenterState)
    })

    it('returns the more recent presenter when both providers have presenters', () => {
      const olderPresenter: PresenterState = {
        segmentId: 'seg-old',
        isPresenting: true,
        timestamp: 1000,
      }
      const newerPresenter: PresenterState = {
        segmentId: 'seg-new',
        isPresenting: true,
        timestamp: 2000,
      }

      hocuspocusAwareness._simulateRemoteUpdate(1, { presenter: olderPresenter })
      webrtcAwareness._simulateRemoteUpdate(1, { presenter: newerPresenter })

      const result = awareness.getActivePresenter()

      expect(result).toEqual(newerPresenter)
      expect(result?.segmentId).toBe('seg-new')
    })

    it('returns hocuspocus presenter when it is more recent', () => {
      const olderPresenter: PresenterState = {
        segmentId: 'seg-webrtc',
        isPresenting: true,
        timestamp: 1000,
      }
      const newerPresenter: PresenterState = {
        segmentId: 'seg-hocuspocus',
        isPresenting: true,
        timestamp: 2000,
      }

      webrtcAwareness._simulateRemoteUpdate(1, { presenter: olderPresenter })
      hocuspocusAwareness._simulateRemoteUpdate(1, { presenter: newerPresenter })

      const result = awareness.getActivePresenter()

      expect(result).toEqual(newerPresenter)
      expect(result?.segmentId).toBe('seg-hocuspocus')
    })

    it('returns the most recent presenter by timestamp when multiple are active', () => {
      const olderPresenter: PresenterState = {
        segmentId: 'seg-old',
        isPresenting: true,
        timestamp: 1000,
      }
      const newerPresenter: PresenterState = {
        segmentId: 'seg-new',
        isPresenting: true,
        timestamp: 2000,
      }

      hocuspocusAwareness._simulateRemoteUpdate(1, { presenter: olderPresenter })
      hocuspocusAwareness._simulateRemoteUpdate(2, { presenter: newerPresenter })

      const result = awareness.getActivePresenter()

      expect(result).toEqual(newerPresenter)
      expect(result?.segmentId).toBe('seg-new')
    })

    it('ignores presenters with isPresenting: false', () => {
      const inactivePresenter: PresenterState = {
        segmentId: 'seg-inactive',
        isPresenting: false,
        timestamp: 3000,
      }
      const activePresenter: PresenterState = {
        segmentId: 'seg-active',
        isPresenting: true,
        timestamp: 1000,
      }

      hocuspocusAwareness._simulateRemoteUpdate(1, { presenter: inactivePresenter })
      webrtcAwareness._simulateRemoteUpdate(2, { presenter: activePresenter })

      const result = awareness.getActivePresenter()

      expect(result).toEqual(activePresenter)
    })

    it('returns null when all presenters are inactive', () => {
      const inactivePresenter: PresenterState = {
        segmentId: 'seg-inactive',
        isPresenting: false,
        timestamp: 1000,
      }
      hocuspocusAwareness._simulateRemoteUpdate(1, { presenter: inactivePresenter })
      webrtcAwareness._simulateRemoteUpdate(1, { presenter: inactivePresenter })

      const result = awareness.getActivePresenter()

      expect(result).toBeNull()
    })

    it('ignores states without presenter field', () => {
      hocuspocusAwareness._simulateRemoteUpdate(1, { user: { name: 'Test User' } })
      webrtcAwareness._simulateRemoteUpdate(1, { user: { name: 'Test User' } })

      const result = awareness.getActivePresenter()

      expect(result).toBeNull()
    })
  })

  describe('onPresenterChange', () => {
    it('subscribes to both providers change events', () => {
      const callback = vi.fn()

      awareness.onPresenterChange(callback)

      expect(hocuspocusAwareness.on).toHaveBeenCalledWith('change', expect.any(Function))
      expect(webrtcAwareness.on).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('calls callback when hocuspocus awareness changes', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      const presenterState: PresenterState = {
        segmentId: 'seg-123',
        isPresenting: true,
        timestamp: Date.now(),
      }
      hocuspocusAwareness._simulateRemoteUpdate(1, { presenter: presenterState })

      expect(callback).toHaveBeenCalledWith(presenterState)
    })

    it('calls callback when webrtc awareness changes', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      const presenterState: PresenterState = {
        segmentId: 'seg-456',
        isPresenting: true,
        timestamp: Date.now(),
      }
      webrtcAwareness._simulateRemoteUpdate(1, { presenter: presenterState })

      expect(callback).toHaveBeenCalledWith(presenterState)
    })

    it('calls callback with null when no presenter is active', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      // Simulate a change event with no presenters
      hocuspocusAwareness._simulateRemoteUpdate(1, { user: { name: 'Test' } })

      expect(callback).toHaveBeenCalledWith(null)
    })

    it('returns unsubscribe function that removes listeners from both providers', () => {
      const callback = vi.fn()
      const unsubscribe = awareness.onPresenterChange(callback)

      unsubscribe()

      expect(hocuspocusAwareness.off).toHaveBeenCalledWith('change', expect.any(Function))
      expect(webrtcAwareness.off).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('handles presenter disconnecting', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      // Presenter connects via webrtc
      const presenterState: PresenterState = {
        segmentId: 'seg-123',
        isPresenting: true,
        timestamp: Date.now(),
      }
      webrtcAwareness._simulateRemoteUpdate(1, { presenter: presenterState })
      expect(callback).toHaveBeenLastCalledWith(presenterState)

      callback.mockClear()

      // Presenter disconnects (state removed)
      webrtcAwareness._clearRemote(1)
      expect(callback).toHaveBeenLastCalledWith(null)
    })
  })

  describe('integration scenarios', () => {
    it('handles presenter navigation sequence', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      // Local user becomes presenter (writes to both)
      awareness.setPresenter('seg-1')
      expect(callback).toHaveBeenCalled()

      // Navigate to next segment
      awareness.setPresenter('seg-2')
      const hocuspocusState = hocuspocusAwareness.states.get(0)?.presenter as PresenterState
      const webrtcState = webrtcAwareness.states.get(0)?.presenter as PresenterState
      expect(hocuspocusState.segmentId).toBe('seg-2')
      expect(webrtcState.segmentId).toBe('seg-2')

      // Stop presenting
      awareness.clearPresenter()
      const clearedHocuspocus = hocuspocusAwareness.states.get(0)?.presenter
      const clearedWebrtc = webrtcAwareness.states.get(0)?.presenter
      expect(clearedHocuspocus).toBeUndefined()
      expect(clearedWebrtc).toBeUndefined()
    })

    it('handles fallback when webrtc is unavailable', () => {
      // Simulate WebRTC being unavailable
      const mocks = createMockDualProviders()
      mocks.providers.webrtc = { awareness: null } as unknown as WebrtcProvider
      const fallbackAwareness = createPresentationAwareness(mocks.providers)

      // Should still work via Hocuspocus
      const presenterState: PresenterState = {
        segmentId: 'seg-fallback',
        isPresenting: true,
        timestamp: Date.now(),
      }
      mocks.hocuspocusAwareness._simulateRemoteUpdate(1, { presenter: presenterState })

      const result = fallbackAwareness.getActivePresenter()
      expect(result).toEqual(presenterState)
    })

    it('handles fallback when hocuspocus is unavailable', () => {
      // Simulate Hocuspocus being unavailable
      const mocks = createMockDualProviders()
      mocks.providers.hocuspocus = { awareness: null } as unknown as HocuspocusProvider
      const fallbackAwareness = createPresentationAwareness(mocks.providers)

      // Should still work via WebRTC
      const presenterState: PresenterState = {
        segmentId: 'seg-p2p',
        isPresenting: true,
        timestamp: Date.now(),
      }
      mocks.webrtcAwareness._simulateRemoteUpdate(1, { presenter: presenterState })

      const result = fallbackAwareness.getActivePresenter()
      expect(result).toEqual(presenterState)
    })

    it('handles multiple presenters syncing across both providers', () => {
      // Presenter A via Hocuspocus
      hocuspocusAwareness._simulateRemoteUpdate(1, {
        presenter: { segmentId: 'seg-A1', isPresenting: true, timestamp: 1000 },
      })

      let activePresenter = awareness.getActivePresenter()
      expect(activePresenter?.segmentId).toBe('seg-A1')

      // Presenter B via WebRTC (more recent timestamp)
      webrtcAwareness._simulateRemoteUpdate(2, {
        presenter: { segmentId: 'seg-B1', isPresenting: true, timestamp: 2000 },
      })

      activePresenter = awareness.getActivePresenter()
      expect(activePresenter?.segmentId).toBe('seg-B1')

      // Presenter A navigates again via Hocuspocus (even more recent)
      hocuspocusAwareness._simulateRemoteUpdate(1, {
        presenter: { segmentId: 'seg-A2', isPresenting: true, timestamp: 3000 },
      })

      activePresenter = awareness.getActivePresenter()
      expect(activePresenter?.segmentId).toBe('seg-A2')
    })
  })
})
