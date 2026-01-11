import { HocuspocusProvider } from '@hocuspocus/provider'
import WebSocket from 'ws'
import * as Y from 'yjs'

console.log('=== Test Start ===')

// Create a class that extends WebSocket but injects headers
function createCookieWebSocketClass(cookieValue: string): typeof WebSocket {
  console.log('Creating class with cookie:', cookieValue)
  
  // Use Proxy to intercept the 'new' call
  return new Proxy(WebSocket, {
    construct(target, args) {
      const [address, protocols] = args
      console.log('>>> Proxy construct called <<<')
      console.log('  address:', address)
      console.log('  protocols:', protocols)
      
      const options: WebSocket.ClientOptions = {
        headers: { Cookie: `auth-session=${cookieValue}` }
      }
      
      if (protocols === undefined) {
        console.log('  Creating WebSocket with options only')
        return new target(address, options)
      } else {
        console.log('  Creating WebSocket with protocols and options')
        return new target(address, protocols, options)
      }
    }
  })
}

console.log('Creating provider...')
const ydoc = new Y.Doc()
const WS = createCookieWebSocketClass('test-cookie-12345')
console.log('WebSocket class created')

const provider = new HocuspocusProvider({
  url: 'ws://localhost:1234',
  name: 'test-document',
  document: ydoc,
  WebSocketPolyfill: WS,
  onConnect: () => {
    console.log('Provider connected')
  },
  onSynced: () => {
    console.log('Provider synced')
  },
  onAuthenticationFailed: ({ reason }) => {
    console.log('Auth failed:', reason)
  },
})

setTimeout(() => {
  console.log('=== Test End ===')
  provider.destroy()
  ydoc.destroy()
  process.exit(0)
}, 5000)
