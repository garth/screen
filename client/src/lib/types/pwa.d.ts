// Ambient declarations for virtual PWA modules provided by vite-plugin-pwa at build time
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
