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
  init(): void
  destroy(): void
  redirectToLogin(): void
  redirectToRegister(): void
}

let ready = $state(false)
let user = $state<UserProfile | null>(null)
let themes = $state<ThemeListItem[]>([])
let documents = $state<DocumentListItem[]>([])
let userChannel = $state<UserChannel | null>(null)

function init() {
  if (!browser || userChannel) return

  const channel = createUserChannel()
  userChannel = channel

  channel.subscribe(() => {
    user = channel.user
    themes = channel.themes
    documents = channel.documents
    ready = true
  })

  channel.onAuthError(() => {
    // User is not authenticated — mark as ready with empty data
    ready = true
  })
}

function destroy() {
  userChannel?.destroy()
  userChannel = null
  disconnectSocket()
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

export const auth: AuthState = {
  get isAuthenticated() {
    return user !== null
  },
  get userId() {
    return user?.id ?? null
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
  init,
  destroy,
  redirectToLogin,
  redirectToRegister,
}
