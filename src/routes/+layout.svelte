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

{@render children()}

<Toasts />
