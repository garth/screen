import type { Channel } from 'phoenix'
import { getSocket } from './phoenix-socket'

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface ThemeListItem {
  id: string
  name: string
  isSystemTheme: boolean
}

export interface DocumentListItem {
  id: string
  title: string
  type: 'presentation' | 'theme' | 'event'
  isPublic: boolean
  isOwner: boolean
  canWrite: boolean
  updatedAt: string
}

export interface UserChannelState {
  readonly user: UserProfile | null
  readonly themes: ThemeListItem[]
  readonly documents: DocumentListItem[]
  readonly joined: boolean
}

type Listener = () => void

interface ErrorResponse {
  reason?: string
  message?: string
}

function pushAsync<T = void>(
  channel: Channel,
  event: string,
  payload: Record<string, unknown>,
  options: { errorMessage: string; extractResult?: (resp: Record<string, unknown>) => T },
): Promise<T> {
  return new Promise((resolve, reject) => {
    channel
      .push(event, payload)
      .receive('ok', (resp: Record<string, unknown>) =>
        resolve(options.extractResult ? options.extractResult(resp) : (undefined as T)),
      )
      .receive('error', (resp: Record<string, unknown>) =>
        reject(new Error((resp as ErrorResponse)?.reason ?? options.errorMessage)),
      )
  })
}

/**
 * Manages the `user:me` channel for authenticated users.
 * Provides user profile, theme list, document list, and mutation methods.
 */
export function createUserChannel() {
  const socket = getSocket()
  const channel: Channel = socket.channel('user:me', {})

  let user: UserProfile | null = null
  let themes: ThemeListItem[] = []
  let documents: DocumentListItem[] = []
  let joined = false
  const listeners: Set<Listener> = new Set()
  const authErrorListeners: Set<Listener> = new Set()

  function notify() {
    for (const fn of listeners) fn()
  }

  // Join the channel
  channel
    .join()
    .receive('ok', (resp: Record<string, unknown>) => {
      user = resp.user as UserProfile
      themes = (resp.themes as ThemeListItem[]) ?? []
      documents = (resp.documents as DocumentListItem[]) ?? []
      joined = true
      notify()
    })
    .receive('error', (resp: Record<string, unknown>) => {
      console.debug('[UserChannel] join error (not authenticated):', resp)
      for (const fn of authErrorListeners) fn()
    })

  // Listen for live updates
  channel.on('user_updated', (payload: Record<string, unknown>) => {
    user = payload.user as UserProfile
    notify()
  })

  channel.on('themes_updated', (payload: Record<string, unknown>) => {
    themes = payload.themes as ThemeListItem[]
    notify()
  })

  channel.on('documents_updated', (payload: Record<string, unknown>) => {
    documents = payload.documents as DocumentListItem[]
    notify()
  })

  return {
    get user() {
      return user
    },
    get themes() {
      return themes
    },
    get documents() {
      return documents
    },
    get joined() {
      return joined
    },

    subscribe(fn: Listener): () => void {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    onAuthError(fn: Listener): () => void {
      authErrorListeners.add(fn)
      return () => authErrorListeners.delete(fn)
    },

    createDocument(type: string = 'presentation', name?: string): Promise<string> {
      return pushAsync(
        channel,
        'create_document',
        { type, ...(name && { name }) },
        {
          errorMessage: 'Failed to create document',
          extractResult: (resp) => resp.id as string,
        },
      )
    },

    deleteDocument(documentId: string): Promise<void> {
      return pushAsync(
        channel,
        'delete_document',
        { id: documentId },
        {
          errorMessage: 'Failed to delete document',
        },
      )
    },

    updateProfile(data: { firstName: string; lastName: string }): Promise<void> {
      return pushAsync(channel, 'update_profile', data, {
        errorMessage: 'Failed to update profile',
      })
    },

    changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
      return pushAsync(channel, 'change_password', data, {
        errorMessage: 'Failed to change password',
      })
    },

    deleteAccount(): Promise<void> {
      return pushAsync(
        channel,
        'delete_account',
        {},
        {
          errorMessage: 'Failed to delete account',
        },
      )
    },

    updateDocument(data: {
      id: string
      name?: string
      isPublic?: boolean
      meta?: Record<string, unknown>
    }): Promise<void> {
      return pushAsync(channel, 'update_document', data, {
        errorMessage: 'Failed to update document',
      })
    },

    destroy() {
      channel.leave()
      listeners.clear()
    },
  }
}

export type UserChannel = ReturnType<typeof createUserChannel>
