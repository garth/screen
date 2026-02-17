<script lang="ts">
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import './layout.css'
  import Toasts from '$lib/components/Toasts.svelte'
  import '$lib/theme.svelte'
  import { auth } from '$lib/stores/auth.svelte'

  // Initialize auth (connects socket + joins user channel)
  auth.init()

  // Register PWA service worker
  onMount(async () => {
    if (browser) {
      const { pwaInfo } = await import('virtual:pwa-info')
      if (pwaInfo) {
        const { registerSW } = await import('virtual:pwa-register')
        registerSW({
          immediate: true,
          onRegistered(r: ServiceWorkerRegistration | undefined) {
            if (r) console.log('SW Registered')
          },
          onRegisterError(error: Error) {
            console.error('SW registration error', error)
          },
        })
      }
    }
  })

  let { children } = $props()
</script>

<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-content"
  >Skip to main content</a>

<div id="main-content">
  {@render children()}
</div>

<Toasts />
