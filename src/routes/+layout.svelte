<script lang="ts">
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import './layout.css'
  import Toasts from '$lib/components/Toasts.svelte'
  import { page } from '$app/state'
  import { resolve } from '$app/paths'
  import { goto, invalidateAll } from '$app/navigation'
  import { logout } from './data.remote'

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

  async function handleLogout() {
    await logout()
    await invalidateAll()
    await goto(resolve('/login'))
  }

  let { children, data } = $props()

  const navLinks = [
    { href: '/presentations', label: 'Presentations' },
    { href: '/events', label: 'Events' },
  ]

  let userMenuOpen = $state(false)

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.user-menu')) {
      userMenuOpen = false
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<nav class="border-b border-gray-700 bg-gray-800">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
    <div class="flex items-center gap-6">
      <a href={resolve('/')} class="text-lg font-semibold text-gray-100">Chapel Screen</a>
      {#if data.user}
        <div class="flex gap-4">
          {#each navLinks as link (link.href)}
            {@const isActive = page.url.pathname === link.href}
            <a
              href={resolve(link.href)}
              class={isActive ? 'font-medium text-blue-400' : 'text-gray-400 hover:text-gray-100'}>
              {link.label}
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-4">
      {#if data.user}
        <div class="user-menu relative">
          <button
            onclick={() => (userMenuOpen = !userMenuOpen)}
            class="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100">
            <img
              src={data.user.gravatarUrl}
              alt={`${data.user.firstName} ${data.user.lastName}`}
              class="h-8 w-8 rounded-full" />
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {#if userMenuOpen}
            <div
              class="absolute top-full right-0 z-20 mt-1 w-48 rounded border border-gray-700 bg-gray-800 py-1 shadow-lg">
              <a
                href={resolve('/preferences')}
                onclick={() => (userMenuOpen = false)}
                class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                Preferences
              </a>
              <button
                onclick={handleLogout}
                class="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700">
                Log out
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <a href={resolve('/login')} class="text-sm text-gray-400 hover:text-gray-100">Log in</a>
        <a href={resolve('/register')} class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
          Register
        </a>
      {/if}
    </div>
  </div>
</nav>

{@render children()}

<footer class="border-t border-gray-700 bg-gray-800 py-4 text-center text-sm text-gray-400">
  <div class="mb-2 flex justify-center gap-4">
    <a href={resolve('/privacy')} class="hover:text-gray-100">Privacy</a>
    <a href={resolve('/terms')} class="hover:text-gray-100">Terms</a>
    <a href={resolve('/support')} class="hover:text-gray-100">Support</a>
  </div>
  &copy; {new Date().getFullYear()}
  <a href="https://nordstack.co.uk" class="text-blue-400 hover:underline">NordStack Ltd</a>
</footer>

<Toasts />
