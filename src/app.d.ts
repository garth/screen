// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// PWA virtual module declarations
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: Error) => void
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}

declare module 'virtual:pwa-info' {
  export const pwaInfo:
    | {
        webManifest: { href: string; useCredentials: boolean }
      }
    | undefined
}

declare global {
  namespace App {
    interface Locals {
      user: import('$lib/server/auth').SessionValidationResult['user']
      session: import('$lib/server/auth').SessionValidationResult['session']
    }

    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
