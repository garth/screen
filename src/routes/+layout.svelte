<script lang="ts">
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import './layout.css'
  import Toasts from '$lib/components/Toasts.svelte'
  import { page } from '$app/state'
  import { resolve } from '$app/paths'
  import { goto, invalidateAll } from '$app/navigation'
  import { logout } from './data.remote'
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
    if (!target.closest('.dropdown')) {
      userMenuOpen = false
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="navbar bg-base-200 border-b border-base-300">
  <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4">
    <div class="flex items-center gap-6">
      <a href={resolve('/')} class="text-lg font-semibold">Chapel Screen</a>
      {#if data.user}
        <div class="flex gap-4">
          {#each navLinks as link (link.href)}
            {@const isActive = page.url.pathname === link.href}
            <a href={resolve(link.href)} class="link link-hover {isActive ? 'text-primary font-medium' : ''}">
              {link.label}
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-4">
      {#if data.user}
        <div class="dropdown dropdown-end">
          <button onclick={() => (userMenuOpen = !userMenuOpen)} class="btn btn-ghost btn-sm gap-2">
            <img
              src={data.user.gravatarUrl}
              alt={`${data.user.firstName} ${data.user.lastName}`}
              class="h-8 w-8 rounded-full" />
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {#if userMenuOpen}
            <ul class="menu dropdown-content bg-base-200 rounded-box z-20 mt-1 w-48 p-2 shadow-lg border border-base-300">
              <li>
                <a href={resolve('/preferences')} onclick={() => (userMenuOpen = false)}>Preferences</a>
              </li>
              <li>
                <button onclick={handleLogout} class="text-error">Log out</button>
              </li>
            </ul>
          {/if}
        </div>
      {:else}
        <a href={resolve('/login')} class="link link-hover">Log in</a>
        <a href={resolve('/register')} class="btn btn-primary btn-sm">Register</a>
      {/if}
    </div>
  </div>
</div>

{@render children()}

<footer class="footer footer-center bg-base-200 border-t border-base-300 p-4 text-base-content">
  <div class="flex gap-4">
    <a href={resolve('/privacy')} class="link link-hover">Privacy</a>
    <a href={resolve('/terms')} class="link link-hover">Terms</a>
    <a href={resolve('/support')} class="link link-hover">Support</a>
  </div>
  <p>
    &copy; {new Date().getFullYear()}
    <a href="https://nordstack.co.uk" class="link link-primary">NordStack Ltd</a>
  </p>
</footer>

<Toasts />
