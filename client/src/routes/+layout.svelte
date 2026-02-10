<script lang="ts">
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import './layout.css'
  import Toasts from '$lib/components/Toasts.svelte'
  import '$lib/theme.svelte'

  // Register PWA service worker
  onMount(async () => {
    if (browser) {
      const { pwaInfo } = await import('virtual:pwa-info')
      if (pwaInfo) {
        const { registerSW } = await import('virtual:pwa-register')
        registerSW({
          immediate: true,
          onRegistered(r) {
            if (r) console.log('SW Registered')
          },
          onRegisterError(error) {
            console.error('SW registration error', error)
          },
        })
      }
    }
  })

  let { children } = $props()
</script>

<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-content">Skip to main content</a>

<div id="main-content">
  {@render children()}
</div>

<Toasts />
