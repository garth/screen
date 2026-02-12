import { browser } from '$app/environment'
import { getSocket, disconnectSocket } from '$lib/providers/phoenix-socket'
import { createUserChannel, type UserChannel, type UserProfile, type ThemeListItem, type DocumentListItem } from '$lib/providers/user-channel'

interface AuthState {
  readonly isAuthenticated: boolean
  readonly userId: string | null
  readonly user: UserProfile | null
  readonly themes: ThemeListItem[]
  readonly documents: DocumentListItem[]
  readonly ready: boolean
  readonly userChannel: UserChannel | null
  init(userId: string): void
  destroy(): void
  redirectToLogin(): void
  redirectToRegister(): void
}

let ready = $state(false)
let userId = $state<string | null>(null)
let user = $state<UserProfile | null>(null)
let themes = $state<ThemeListItem[]>([])
let documents = $state<DocumentListItem[]>([])
let userChannel = $state<UserChannel | null>(null)

function init(id: string) {
  if (!browser) return

  // Clean up any existing channel
  userChannel?.destroy()

  userId = id

  const channel = createUserChannel(id)
  userChannel = channel

  channel.subscribe(() => {
    user = channel.user
    themes = channel.themes
    documents = channel.documents
    ready = true
  })
}

function destroy() {
  userChannel?.destroy()
  userChannel = null
  disconnectSocket()
  userId = null
  user = null
  themes = []
  documents = []
  ready = false
}

function redirectToLogin() {
  if (browser) {
    window.location.href = '/users/log-in'
  }
}

function redirectToRegister() {
  if (browser) {
    window.location.href = '/users/register'
  }
}

/**
 * Connect to the Phoenix socket eagerly so document channels
 * can join immediately when pages mount.
 */
function ensureSocket() {
  if (browser) {
    getSocket()
  }
}

export const auth: AuthState = {
  get isAuthenticated() {
    return userId !== null
  },
  get userId() {
    return userId
  },
  get user() {
    return user
  },
  get themes() {
    return themes
  },
  get documents() {
    return documents
  },
  get ready() {
    return ready
  },
  get userChannel() {
    return userChannel
  },
  init(id: string) {
    ensureSocket()
    init(id)
  },
  destroy,
  redirectToLogin,
  redirectToRegister,
}
