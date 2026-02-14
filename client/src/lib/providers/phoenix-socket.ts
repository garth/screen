import { Socket } from 'phoenix'

const wsUrl = import.meta.env.VITE_WS_URL || '/socket'

let socket: Socket | null = null

/**
 * Get or create the shared Phoenix Socket singleton.
 * Connects lazily on first call.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = new Socket(wsUrl, {
      params: () => {
        // Session token is managed by Phoenix via cookies —
        // the browser sends it automatically. No explicit token param needed
        // unless we add token-based auth later.
        return {}
      },
    })
    socket.connect()
  }
  return socket
}

/**
 * Disconnect and dispose the shared socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
