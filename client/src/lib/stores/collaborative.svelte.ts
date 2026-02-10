import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'

export function createCollaborativeDoc(documentId: string) {
  let connected = $state(false)
  let synced = $state(false)

  const ydoc = new Y.Doc()
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
    },
  })

  return {
    get connected() {
      return connected
    },
    get synced() {
      return synced
    },
    ydoc,
    provider,
    destroy() {
      provider.destroy()
      ydoc.destroy()
    },
  }
}
