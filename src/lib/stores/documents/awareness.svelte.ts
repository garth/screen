import type { HocuspocusProvider } from '@hocuspocus/provider'

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

export function createPresentationAwareness(provider: HocuspocusProvider): PresentationAwareness {
  const awareness = provider.awareness

  function getActivePresenter(): PresenterState | null {
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

  return {
    setPresenter(segmentId: string) {
      awareness?.setLocalStateField('presenter', {
        segmentId,
        isPresenting: true,
        timestamp: Date.now(),
      })
    },

    clearPresenter() {
      awareness?.setLocalStateField('presenter', null)
    },

    getActivePresenter,

    onPresenterChange(callback: (presenter: PresenterState | null) => void): () => void {
      const handler = () => callback(getActivePresenter())
      awareness?.on('change', handler)
      return () => awareness?.off('change', handler)
    },
  }
}
