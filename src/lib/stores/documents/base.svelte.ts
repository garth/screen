import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import type { DocumentOptions, UserInfo } from './types'

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
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Use the hash to generate HSL color with good saturation and lightness
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

export interface BaseDocument {
  readonly connected: boolean
  readonly synced: boolean
  readonly readOnly: boolean
  readonly ydoc: Y.Doc
  readonly meta: Y.Map<unknown>
  readonly baseYdoc: Y.Doc | null
  readonly baseMeta: Y.Map<unknown> | null
  readonly provider: HocuspocusProvider
  readonly baseProvider: HocuspocusProvider | null
  destroy(): void
}

export function createBaseDocument(options: BaseDocumentOptions): BaseDocument {
  let connected = $state(false)
  let synced = $state(false)
  let readOnly = $state(false)

  const ydoc = new Y.Doc()
  const meta = ydoc.getMap('meta')

  const wsUrl = import.meta.env.VITE_HOCUSPOCUS_URL || 'ws://localhost:1234'

  const provider = new HocuspocusProvider({
    url: wsUrl,
    name: options.documentId,
    document: ydoc,
    onConnect: () => {
      connected = true
    },
    onDisconnect: () => {
      connected = false
    },
    onSynced: () => {
      synced = true
      options.onDocumentSynced?.()
    },
  })

  // Set user awareness state for collaborative cursors
  if (options.user) {
    const color = options.user.color || generateUserColor(options.user.id)
    provider.awareness?.setLocalStateField('user', {
      name: options.user.name,
      color,
    })
  }

  // Handle base document if specified (for theme inheritance)
  let baseYdoc: Y.Doc | null = null
  let baseProvider: HocuspocusProvider | null = null
  let baseMeta: Y.Map<unknown> | null = null

  if (options.baseDocumentId) {
    baseYdoc = new Y.Doc()
    baseMeta = baseYdoc.getMap('meta')
    baseProvider = new HocuspocusProvider({
      url: wsUrl,
      name: options.baseDocumentId,
      document: baseYdoc,
    })
  }

  // Meta observation for DB sync with debouncing
  let metaObserverTimeout: ReturnType<typeof setTimeout> | null = null

  function observeMeta() {
    meta.observe(() => {
      if (metaObserverTimeout) clearTimeout(metaObserverTimeout)
      metaObserverTimeout = setTimeout(() => {
        const serialized = meta.toJSON() as Record<string, unknown>
        options.onMetaChange?.(serialized)
      }, 500)
    })
  }

  provider.on('synced', observeMeta)

  return {
    get connected() {
      return connected
    },
    get synced() {
      return synced
    },
    get readOnly() {
      return readOnly
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
    destroy() {
      if (metaObserverTimeout) clearTimeout(metaObserverTimeout)
      baseProvider?.destroy()
      baseYdoc?.destroy()
      provider.destroy()
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
