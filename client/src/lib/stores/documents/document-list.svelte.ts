import { HocuspocusProvider } from '@hocuspocus/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import { browser } from '$app/environment'
import * as Y from 'yjs'

// =============================================================================
// Types
// =============================================================================

export interface DocumentListItem {
  id: string
  title: string
  type: 'presentation' | 'theme' | 'event'
  isPublic: boolean
  isOwner: boolean
  canWrite: boolean
  updatedAt: string
}

export interface DocumentListDocument {
  readonly documents: DocumentListItem[]
  readonly presentations: DocumentListItem[]
  readonly themes: DocumentListItem[]
  readonly events: DocumentListItem[]
  readonly connected: boolean
  readonly synced: boolean
  destroy(): void
}

export interface DocumentListOptions {
  userId: string
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Get the document list ID for a user
 */
export function getDocumentListId(userId: string): string {
  return `user-${userId}-documents`
}

/**
 * Create a document list store for offline-capable document listing
 */
export function createDocumentListDoc(options: DocumentListOptions): DocumentListDocument {
  const documentId = getDocumentListId(options.userId)

  let connected = $state(false)
  let synced = $state(false)
  let documents = $state<DocumentListItem[]>([])

  const ydoc = new Y.Doc()
  const documentsMap = ydoc.getMap<{
    title: string
    type: 'presentation' | 'theme' | 'event'
    isPublic: boolean
    isOwner: boolean
    canWrite: boolean
    updatedAt: string
  }>('documents')

  // IndexedDB persistence for offline support (browser only)
  const indexeddbProvider = browser ? new IndexeddbPersistence(`doc-${documentId}`, ydoc) : null

  // Sync documents array from Y.Map
  function syncDocuments() {
    const items: DocumentListItem[] = []
    documentsMap.forEach((value, key) => {
      items.push({
        id: key,
        ...value,
      })
    })
    // Sort by updatedAt descending
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- Date used for comparison, not reactive state
    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    documents = items
  }

  // Observe map changes
  documentsMap.observe(() => {
    syncDocuments()
  })

  // Also sync when IndexedDB loads (for offline startup)
  if (indexeddbProvider) {
    indexeddbProvider.on('synced', () => {
      syncDocuments()
    })
  }

  const wsUrl = import.meta.env.VITE_HOCUSPOCUS_URL || 'ws://localhost:1234'

  const provider = new HocuspocusProvider({
    url: wsUrl,
    name: documentId,
    document: ydoc,
    onConnect: () => {
      connected = true
    },
    onDisconnect: () => {
      connected = false
    },
    onSynced: () => {
      synced = true
      syncDocuments()
    },
  })

  // Derived arrays for filtered access
  const presentations = $derived(documents.filter((d) => d.type === 'presentation'))
  const themes = $derived(documents.filter((d) => d.type === 'theme'))
  const events = $derived(documents.filter((d) => d.type === 'event'))

  return {
    get documents() {
      return documents
    },
    get presentations() {
      return presentations
    },
    get themes() {
      return themes
    },
    get events() {
      return events
    },
    get connected() {
      return connected
    },
    get synced() {
      return synced
    },
    destroy() {
      provider.destroy()
      indexeddbProvider?.destroy()
      ydoc.destroy()
    },
  }
}
