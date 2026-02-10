import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { PhoenixChannelProvider } from 'y-phoenix-channel'
import { createPresentationAwareness, type PresenterState } from './awareness.svelte'

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

// Create a mock PhoenixChannelProvider
function createMockProvider(mockAwareness = createMockAwareness()) {
  return {
    provider: { awareness: mockAwareness } as unknown as PhoenixChannelProvider,
    awareness: mockAwareness,
  }
}

describe('createPresentationAwareness', () => {
  let mockAwareness: ReturnType<typeof createMockAwareness>
  let provider: PhoenixChannelProvider
  let awareness: ReturnType<typeof createPresentationAwareness>

  beforeEach(() => {
    vi.clearAllMocks()
    const mocks = createMockProvider()
    provider = mocks.provider
    mockAwareness = mocks.awareness
    awareness = createPresentationAwareness(provider)
  })

  describe('setPresenter', () => {
    it('sets presenter state on awareness', () => {
      awareness.setPresenter('seg-123')

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith(
        'presenter',
        expect.objectContaining({
          segmentId: 'seg-123',
          isPresenting: true,
          timestamp: expect.any(Number),
        }),
      )
    })

    it('updates timestamp on each call', async () => {
      awareness.setPresenter('seg-1')
      const firstCall = mockAwareness.setLocalStateField.mock.calls[0][1] as PresenterState
      const firstTimestamp = firstCall.timestamp

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 5))

      awareness.setPresenter('seg-2')
      const secondCall = mockAwareness.setLocalStateField.mock.calls[1][1] as PresenterState
      const secondTimestamp = secondCall.timestamp

      expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp)
    })
  })

  describe('clearPresenter', () => {
    it('clears presenter state on awareness', () => {
      awareness.setPresenter('seg-123')
      awareness.clearPresenter()

      expect(mockAwareness.setLocalStateField).toHaveBeenLastCalledWith('presenter', null)
    })
  })

  describe('getActivePresenter', () => {
    it('returns null when no presenter is active', () => {
      const result = awareness.getActivePresenter()

      expect(result).toBeNull()
    })

    it('returns presenter from remote state', () => {
      const presenterState: PresenterState = {
        segmentId: 'seg-abc',
        isPresenting: true,
        timestamp: Date.now(),
      }
      mockAwareness._simulateRemoteUpdate(1, { presenter: presenterState })

      const result = awareness.getActivePresenter()

      expect(result).toEqual(presenterState)
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

      mockAwareness._simulateRemoteUpdate(1, { presenter: olderPresenter })
      mockAwareness._simulateRemoteUpdate(2, { presenter: newerPresenter })

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

      mockAwareness._simulateRemoteUpdate(1, { presenter: inactivePresenter })
      mockAwareness._simulateRemoteUpdate(2, { presenter: activePresenter })

      const result = awareness.getActivePresenter()

      expect(result).toEqual(activePresenter)
    })

    it('returns null when all presenters are inactive', () => {
      const inactivePresenter: PresenterState = {
        segmentId: 'seg-inactive',
        isPresenting: false,
        timestamp: 1000,
      }
      mockAwareness._simulateRemoteUpdate(1, { presenter: inactivePresenter })

      const result = awareness.getActivePresenter()

      expect(result).toBeNull()
    })

    it('ignores states without presenter field', () => {
      mockAwareness._simulateRemoteUpdate(1, { user: { name: 'Test User' } })

      const result = awareness.getActivePresenter()

      expect(result).toBeNull()
    })
  })

  describe('onPresenterChange', () => {
    it('subscribes to awareness change events', () => {
      const callback = vi.fn()

      awareness.onPresenterChange(callback)

      expect(mockAwareness.on).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('calls callback when awareness changes', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      const presenterState: PresenterState = {
        segmentId: 'seg-123',
        isPresenting: true,
        timestamp: Date.now(),
      }
      mockAwareness._simulateRemoteUpdate(1, { presenter: presenterState })

      expect(callback).toHaveBeenCalledWith(presenterState)
    })

    it('calls callback with null when no presenter is active', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      // Simulate a change event with no presenters
      mockAwareness._simulateRemoteUpdate(1, { user: { name: 'Test' } })

      expect(callback).toHaveBeenCalledWith(null)
    })

    it('returns unsubscribe function that removes listener', () => {
      const callback = vi.fn()
      const unsubscribe = awareness.onPresenterChange(callback)

      unsubscribe()

      expect(mockAwareness.off).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('handles presenter disconnecting', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      // Presenter connects
      const presenterState: PresenterState = {
        segmentId: 'seg-123',
        isPresenting: true,
        timestamp: Date.now(),
      }
      mockAwareness._simulateRemoteUpdate(1, { presenter: presenterState })
      expect(callback).toHaveBeenLastCalledWith(presenterState)

      callback.mockClear()

      // Presenter disconnects (state removed)
      mockAwareness._clearRemote(1)
      expect(callback).toHaveBeenLastCalledWith(null)
    })
  })

  describe('integration scenarios', () => {
    it('handles presenter navigation sequence', () => {
      const callback = vi.fn()
      awareness.onPresenterChange(callback)

      // Local user becomes presenter
      awareness.setPresenter('seg-1')
      expect(callback).toHaveBeenCalled()

      // Navigate to next segment
      awareness.setPresenter('seg-2')
      const state = mockAwareness.states.get(0)?.presenter as PresenterState
      expect(state.segmentId).toBe('seg-2')

      // Stop presenting
      awareness.clearPresenter()
      const cleared = mockAwareness.states.get(0)?.presenter
      expect(cleared).toBeUndefined()
    })
  })
})
