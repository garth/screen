import * as Y from 'yjs'
import { browser } from '$app/environment'
import { PhoenixChannelProvider } from 'y-phoenix-channel'
import { IndexeddbPersistence } from 'y-indexeddb'
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

// Compaction interval (compact after this many updates)
const COMPACTION_THRESHOLD = 100

export function createPresenterAwarenessDoc(
  options: PresenterAwarenessDocOptions,
): PresenterAwarenessDoc {
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

  // IndexedDB persistence
  const indexeddb = new IndexeddbPersistence(`presenter-awareness-${documentId}`, ydoc)

  // Phoenix Channel provider for sync
  const socket = getSocket()
  const provider = new PhoenixChannelProvider(socket, `document:presenter-awareness-${documentId}`, ydoc, {
    params: {},
  })

  let synced = $state(false)
  let updateCount = 0

  indexeddb.on('synced', () => {
    const stored = presenterMap.get('current')
    console.log('[PresenterAwareness] IndexedDB synced, stored value:', stored)
    synced = true
  })

  // Compact the document by creating a fresh snapshot
  // This removes all history and keeps only current state
  function compact() {
    // Get current state
    const currentState = presenterMap.get('current')

    // Create a fresh Y.Doc with same structure
    const freshDoc = new Y.Doc()
    const freshMap = freshDoc.getMap<PresenterState | null>('presenter')
    if (currentState) {
      freshMap.set('current', currentState)
    }

    // Encode the fresh doc as a single update
    const compactedUpdate = Y.encodeStateAsUpdate(freshDoc)

    // Clear the old doc and apply the compacted state
    // This is done by creating a new persistence entry
    indexeddb.clearData().then(() => {
      Y.applyUpdate(ydoc, compactedUpdate)
    })

    freshDoc.destroy()
    updateCount = 0
  }

  return {
    get synced() {
      return synced
    },

    get canWrite() {
      return canWrite
    },

    getPresenter(): PresenterState | null {
      const value = presenterMap.get('current') ?? null
      console.log('[PresenterAwareness] getPresenter called, returning:', value)
      return value
    },

    setPresenter(segmentId: string) {
      // Only users with write access can set presenter position
      if (!canWrite) return

      console.log('[PresenterAwareness] setPresenter called with:', segmentId)
      presenterMap.set('current', {
        segmentId,
        isPresenting: true,
        timestamp: Date.now(),
      })

      // Track updates and compact periodically
      updateCount++
      if (updateCount >= COMPACTION_THRESHOLD) {
        compact()
      }
    },

    clearPresenter() {
      // Only users with write access can clear presenter position
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
      indexeddb.destroy()
      ydoc.destroy()
    },
  }
}
