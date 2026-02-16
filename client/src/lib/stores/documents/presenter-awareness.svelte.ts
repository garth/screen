import * as Y from 'yjs'
import { browser } from '$app/environment'
import { PhoenixChannelProvider } from 'y-phoenix-channel'
import { getSocket } from '$lib/providers/phoenix-socket'

export interface PresenterState {
  segmentId: string
  isPresenting: boolean
  timestamp: number
  userId?: string
}

export interface PresenterAwarenessDocOptions {
  documentId: string
  canWrite: boolean // Only users with write access can set presenter position
}

export interface PresenterAwarenessDoc {
  readonly synced: boolean
  readonly canWrite: boolean

  // Get the active presenter state
  getPresenter(): PresenterState | null

  // Set this client as presenter (only works if canWrite is true)
  setPresenter(segmentId: string): void

  // Clear presenter state (only works if canWrite is true)
  clearPresenter(): void

  // Subscribe to presenter changes
  onPresenterChange(callback: (state: PresenterState | null) => void): () => void

  destroy(): void
}

export function createPresenterAwarenessDoc(options: PresenterAwarenessDocOptions): PresenterAwarenessDoc {
  const { documentId, canWrite } = options

  if (!browser) {
    // SSR stub
    return {
      synced: false,
      canWrite: false,
      getPresenter: () => null,
      setPresenter: () => {},
      clearPresenter: () => {},
      onPresenterChange: () => () => {},
      destroy: () => {},
    }
  }

  const ydoc = new Y.Doc()
  const presenterMap = ydoc.getMap<PresenterState | null>('presenter')

  const socket = getSocket()
  const provider = new PhoenixChannelProvider(socket, `document:presenter-awareness-${documentId}`, ydoc, {
    params: {},
  })

  // Presenter awareness syncs cross-tab via BroadcastChannel (built into the
  // provider). The Phoenix channel join fails because this isn't a real document
  // ID, but BroadcastChannel relay still works. Mark synced immediately so
  // consumers aren't gated on a server sync that will never complete.
  const synced = true

  return {
    get synced() {
      return synced
    },

    get canWrite() {
      return canWrite
    },

    getPresenter(): PresenterState | null {
      return presenterMap.get('current') ?? null
    },

    setPresenter(segmentId: string) {
      if (!canWrite) return

      presenterMap.set('current', {
        segmentId,
        isPresenting: true,
        timestamp: Date.now(),
      })
    },

    clearPresenter() {
      if (!canWrite) return

      presenterMap.set('current', null)
    },

    onPresenterChange(callback: (state: PresenterState | null) => void): () => void {
      const handler = () => {
        callback(presenterMap.get('current') ?? null)
      }
      presenterMap.observe(handler)
      return () => presenterMap.unobserve(handler)
    },

    destroy() {
      provider.destroy()
      ydoc.destroy()
    },
  }
}
