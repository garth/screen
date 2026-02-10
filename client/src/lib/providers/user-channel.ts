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

export interface UserChannelState {
  readonly user: UserProfile | null
  readonly themes: ThemeListItem[]
  readonly joined: boolean
}

type Listener = () => void

interface ErrorResponse {
  reason?: string
  message?: string
}

/**
 * Manages the `user:{userId}` channel for authenticated users.
 * Provides user profile, theme list, and mutation methods.
 */
export function createUserChannel(userId: string) {
  const socket = getSocket()
  const channel: Channel = socket.channel(`user:${userId}`, {})

  let user: UserProfile | null = null
  let themes: ThemeListItem[] = []
  let joined = false
  const listeners: Set<Listener> = new Set()

  function notify() {
    for (const fn of listeners) fn()
  }

  function errorMessage(resp: ErrorResponse, fallback: string): string {
    return resp?.reason ?? resp?.message ?? fallback
  }

  // Join the channel
  channel
    .join()
    .receive('ok', (resp: Record<string, unknown>) => {
      user = resp.user as UserProfile
      themes = (resp.themes as ThemeListItem[]) ?? []
      joined = true
      notify()
    })
    .receive('error', (resp: Record<string, unknown>) => {
      console.error('[UserChannel] join error:', resp)
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

  return {
    get user() {
      return user
    },
    get themes() {
      return themes
    },
    get joined() {
      return joined
    },

    subscribe(fn: Listener): () => void {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    async createDocument(type: string = 'presentation'): Promise<string> {
      return new Promise((resolve, reject) => {
        channel
          .push('create_document', { type })
          .receive('ok', (resp: Record<string, unknown>) => resolve(resp.id as string))
          .receive('error', (resp: Record<string, unknown>) =>
            reject(new Error(errorMessage(resp as ErrorResponse, 'Failed to create document'))),
          )
      })
    },

    async deleteDocument(documentId: string): Promise<void> {
      return new Promise((resolve, reject) => {
        channel
          .push('delete_document', { id: documentId })
          .receive('ok', () => resolve())
          .receive('error', (resp: Record<string, unknown>) =>
            reject(new Error(errorMessage(resp as ErrorResponse, 'Failed to delete document'))),
          )
      })
    },

    async updateProfile(data: { firstName: string; lastName: string }): Promise<void> {
      return new Promise((resolve, reject) => {
        channel
          .push('update_profile', data)
          .receive('ok', () => resolve())
          .receive('error', (resp: Record<string, unknown>) =>
            reject(new Error(errorMessage(resp as ErrorResponse, 'Failed to update profile'))),
          )
      })
    },

    async changePassword(data: {
      currentPassword: string
      newPassword: string
    }): Promise<void> {
      return new Promise((resolve, reject) => {
        channel
          .push('change_password', data)
          .receive('ok', () => resolve())
          .receive('error', (resp: Record<string, unknown>) =>
            reject(new Error(errorMessage(resp as ErrorResponse, 'Failed to change password'))),
          )
      })
    },

    async deleteAccount(): Promise<void> {
      return new Promise((resolve, reject) => {
        channel
          .push('delete_account', {})
          .receive('ok', () => resolve())
          .receive('error', (resp: Record<string, unknown>) =>
            reject(new Error(errorMessage(resp as ErrorResponse, 'Failed to delete account'))),
          )
      })
    },

    destroy() {
      channel.leave()
      listeners.clear()
    },
  }
}

export type UserChannel = ReturnType<typeof createUserChannel>
