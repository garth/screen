import type { HocuspocusProvider } from '@hocuspocus/provider'
import type { WebrtcProvider } from 'y-webrtc'
import type { Awareness } from 'y-protocols/awareness'

export interface PresenterState {
  segmentId: string
  isPresenting: boolean
  timestamp: number
}

export interface PresentationAwareness {
  // Set this client as presenter with current segment
  setPresenter(segmentId: string): void

  // Clear presenter state (when leaving presenter mode)
  clearPresenter(): void

  // Get the active presenter (most recent by timestamp)
  getActivePresenter(): PresenterState | null

  // Subscribe to presenter changes
  onPresenterChange(callback: (presenter: PresenterState | null) => void): () => void
}

export interface DualProviders {
  hocuspocus: HocuspocusProvider
  webrtc: WebrtcProvider
}

/**
 * Creates presentation awareness using both WebRTC (P2P) and Hocuspocus (server) for redundancy.
 *
 * - Writes presenter state to BOTH providers for maximum availability
 * - Reads from BOTH and merges results (most recent timestamp wins)
 * - WebRTC provides low-latency P2P sync
 * - Hocuspocus provides fallback when WebRTC is unavailable
 */
export function createPresentationAwareness(providers: DualProviders): PresentationAwareness {
  const hocuspocusAwareness = providers.hocuspocus.awareness
  const webrtcAwareness = providers.webrtc.awareness

  function getActivePresenterFromAwareness(awareness: Awareness | null): PresenterState | null {
    const states = awareness?.getStates()
    if (!states) return null

    let activePresenter: PresenterState | null = null
    for (const [, state] of states) {
      const presenter = state.presenter as PresenterState | undefined
      if (presenter?.isPresenting) {
        if (!activePresenter || presenter.timestamp > activePresenter.timestamp) {
          activePresenter = presenter
        }
      }
    }
    return activePresenter
  }

  function getActivePresenter(): PresenterState | null {
    // Get from both providers and return the most recent
    const fromHocuspocus = getActivePresenterFromAwareness(hocuspocusAwareness)
    const fromWebrtc = getActivePresenterFromAwareness(webrtcAwareness)

    if (!fromHocuspocus) return fromWebrtc
    if (!fromWebrtc) return fromHocuspocus

    // Return whichever has the more recent timestamp
    return fromWebrtc.timestamp >= fromHocuspocus.timestamp ? fromWebrtc : fromHocuspocus
  }

  return {
    setPresenter(segmentId: string) {
      const state: PresenterState = {
        segmentId,
        isPresenting: true,
        timestamp: Date.now(),
      }
      // Write to both providers for redundancy
      hocuspocusAwareness?.setLocalStateField('presenter', state)
      webrtcAwareness?.setLocalStateField('presenter', state)
    },

    clearPresenter() {
      // Clear on both providers
      hocuspocusAwareness?.setLocalStateField('presenter', null)
      webrtcAwareness?.setLocalStateField('presenter', null)
    },

    getActivePresenter,

    onPresenterChange(callback: (presenter: PresenterState | null) => void): () => void {
      // Subscribe to both providers and call callback when either changes
      const handler = () => callback(getActivePresenter())

      hocuspocusAwareness?.on('change', handler)
      webrtcAwareness?.on('change', handler)

      return () => {
        hocuspocusAwareness?.off('change', handler)
        webrtcAwareness?.off('change', handler)
      }
    },
  }
}
