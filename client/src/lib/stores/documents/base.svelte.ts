import { PhoenixChannelProvider } from 'y-phoenix-channel'
import { IndexeddbPersistence } from 'y-indexeddb'
import { browser } from '$app/environment'
import { getSocket } from '$lib/providers/phoenix-socket'
import * as Y from 'yjs'
import type { DocumentOptions } from './types'

export interface BaseDocumentOptions extends DocumentOptions {
  onDocumentSynced?: () => void
}

/**
 * Generate a deterministic color from a user ID
 */
function generateUserColor(userId: string): string {
  // Hash the user ID to get a consistent number
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Use the hash to generate HSL color with good saturation and lightness
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

export interface BaseDocument {
  readonly connected: boolean
  readonly synced: boolean
  readonly syncTimedOut: boolean
  readonly readOnly: boolean
  readonly error: string | null
  readonly ydoc: Y.Doc
  readonly meta: Y.Map<unknown>
  readonly baseYdoc: Y.Doc | null
  readonly baseMeta: Y.Map<unknown> | null
  readonly provider: PhoenixChannelProvider
  readonly baseProvider: PhoenixChannelProvider | null
  retry(): void
  destroy(): void
}

export function createBaseDocument(options: BaseDocumentOptions): BaseDocument {
  let connected = $state(false)
  let synced = $state(false)
  let syncTimedOut = $state(false)
  let readOnly = $state(false)
  let error = $state<string | null>(null)

  const SYNC_TIMEOUT_MS = 15_000
  let syncTimeout: ReturnType<typeof setTimeout> | null = null

  function startSyncTimeout() {
    if (syncTimeout) clearTimeout(syncTimeout)
    syncTimedOut = false
    syncTimeout = setTimeout(() => {
      if (!synced) syncTimedOut = true
    }, SYNC_TIMEOUT_MS)
  }

  if (browser) startSyncTimeout()

  const ydoc = new Y.Doc()
  const meta = ydoc.getMap('meta')

  // IndexedDB persistence for offline support and faster initial loads (browser only)
  const indexeddbProvider = browser ? new IndexeddbPersistence(`doc-${options.documentId}`, ydoc) : null

  const socket = getSocket()

  const provider = new PhoenixChannelProvider(socket, `document:${options.documentId}`, ydoc, {
    params: {},
  })

  // Listen for permissions pushed by the server after join
  // (y-phoenix-channel ignores the join reply payload, so the server sends a separate event)
  let permissionsListenerAdded = false

  // Intercept channel join errors to detect permission/not-found issues.
  // Uses both joinPush error callback and channel onError for reliability.
  let joinErrorHandlerAdded = false

  function setupJoinErrorHandler() {
    if (joinErrorHandlerAdded || !provider.channel) return
    joinErrorHandlerAdded = true

    const channel = provider.channel

    // Hook into the joinPush to detect join error replies (e.g. "not found")
    const joinPush = (channel as unknown as Record<string, unknown>).joinPush as
      | {
          receive: (status: string, callback: (response: Record<string, unknown>) => void) => unknown
          receivedResp?: { status: string; response: Record<string, unknown> }
        }
      | undefined

    if (joinPush) {
      // Check if already received an error (in case we're late)
      if (joinPush.receivedResp?.status === 'error') {
        error = (joinPush.receivedResp.response?.reason as string) || 'error'
        syncTimedOut = true
        if (syncTimeout) clearTimeout(syncTimeout)
        return
      }

      joinPush.receive('error', (response) => {
        error = (response?.reason as string) || 'error'
        syncTimedOut = true
        if (syncTimeout) clearTimeout(syncTimeout)
      })
    }

    // Also use channel.onError as a fallback (fires on phx_error / channel crash)
    channel.onError(() => {
      if (!synced && !error) {
        const resp = (channel as unknown as Record<string, unknown>).joinPush as
          | { receivedResp?: { status: string; response: Record<string, unknown> } }
          | undefined
        if (resp?.receivedResp?.status === 'error') {
          error = (resp.receivedResp.response?.reason as string) || 'error'
        } else {
          error = 'error'
        }
        syncTimedOut = true
        if (syncTimeout) clearTimeout(syncTimeout)
      }
    })
  }

  // Set up immediately (channel exists from constructor)
  setupJoinErrorHandler()

  provider.on('status', ({ status }) => {
    connected = status === 'connected'

    if (status === 'connected') {
      error = null // Clear error on successful connection
    }

    // Also try to set up on connecting (for reconnects or delayed socket connection)
    if (status === 'connecting') {
      joinErrorHandlerAdded = false // Reset for new channel
      setupJoinErrorHandler()
    }

    if (status === 'connected' && provider.channel && !permissionsListenerAdded) {
      permissionsListenerAdded = true
      provider.channel.on('permissions', (payload: Record<string, unknown>) => {
        readOnly = payload.read_only as boolean
      })
    }
  })

  provider.on('sync', (isSynced: boolean) => {
    if (isSynced && !synced) {
      synced = true
      syncTimedOut = false
      if (syncTimeout) clearTimeout(syncTimeout)
      options.onDocumentSynced?.()
    }
  })

  // Set user awareness state for collaborative cursors
  if (options.user) {
    const color = options.user.color || generateUserColor(options.user.id)
    provider.awareness.setLocalStateField('user', {
      name: options.user.name,
      color,
    })
  }

  // Handle base document if specified (for theme inheritance)
  let baseYdoc: Y.Doc | null = null
  let baseProvider: PhoenixChannelProvider | null = null
  let baseMeta: Y.Map<unknown> | null = null

  if (options.baseDocumentId) {
    baseYdoc = new Y.Doc()
    baseMeta = baseYdoc.getMap('meta')
    baseProvider = new PhoenixChannelProvider(socket, `document:${options.baseDocumentId}`, baseYdoc, {
      params: {},
    })
  }

  // Meta observation for DB sync with debouncing
  let metaObserverTimeout: ReturnType<typeof setTimeout> | null = null
  let metaObserverAttached = false

  function observeMeta() {
    if (metaObserverAttached) return
    metaObserverAttached = true
    meta.observe(() => {
      if (metaObserverTimeout) clearTimeout(metaObserverTimeout)
      metaObserverTimeout = setTimeout(() => {
        const serialized = meta.toJSON() as Record<string, unknown>
        options.onMetaChange?.(serialized)
      }, 500)
    })
  }

  provider.on('sync', (isSynced: boolean) => {
    if (isSynced) observeMeta()
  })

  return {
    get connected() {
      return connected
    },
    get synced() {
      return synced
    },
    get syncTimedOut() {
      return syncTimedOut
    },
    get readOnly() {
      return readOnly
    },
    get error() {
      return error
    },
    get ydoc() {
      return ydoc
    },
    get meta() {
      return meta
    },
    get baseYdoc() {
      return baseYdoc
    },
    get baseMeta() {
      return baseMeta
    },
    get provider() {
      return provider
    },
    get baseProvider() {
      return baseProvider
    },
    retry() {
      if (synced) return
      syncTimedOut = false
      provider.destroy()
      // Reconnect by creating a new provider instance is complex;
      // simplest approach: reload the page
      if (browser) window.location.reload()
    },
    destroy() {
      if (syncTimeout) clearTimeout(syncTimeout)
      if (metaObserverTimeout) clearTimeout(metaObserverTimeout)
      baseProvider?.destroy()
      baseYdoc?.destroy()
      provider.destroy()
      indexeddbProvider?.destroy()
      ydoc.destroy()
    },
  }
}

export interface ReactiveMetaProperty<T> {
  get(): T
  set(value: T): void
  subscribe(): void
}

export function createReactiveMetaProperty<T>(
  meta: Y.Map<unknown>,
  key: string,
  defaultValue: T,
): ReactiveMetaProperty<T> {
  let value = $state<T>(defaultValue)

  // Initialize from existing meta if present
  const existing = meta.get(key)
  if (existing !== undefined) {
    value = existing as T
  }

  let subscribed = false

  return {
    get() {
      return value
    },
    set(newValue: T) {
      meta.set(key, newValue)
    },
    subscribe() {
      if (subscribed) return
      subscribed = true

      // Set initial value after sync
      const current = meta.get(key)
      if (current !== undefined) {
        value = current as T
      }

      meta.observe((event) => {
        if (event.keysChanged.has(key)) {
          const newValue = meta.get(key)
          value = newValue !== undefined ? (newValue as T) : defaultValue
        }
      })
    },
  }
}
