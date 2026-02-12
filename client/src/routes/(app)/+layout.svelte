<script lang="ts">
  import { page } from '$app/state'
  import { resolve } from '$app/paths'
  import { auth } from '$lib/stores/auth.svelte'

  function handleLogout() {
    auth.destroy()
    window.location.href = '/users/log-out'
  }

  let { children } = $props()

  const navLinks: { href: string; label: string }[] = [
    { href: '/presentations', label: 'Presentations' },
    { href: '/events', label: 'Events' },
    { href: '/themes', label: 'Themes' },
  ]

  let userMenuOpen = $state(false)
  let menuElement: HTMLUListElement | undefined = $state()

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.dropdown')) {
      userMenuOpen = false
    }
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    if (!userMenuOpen) return

    if (event.key === 'Escape') {
      event.preventDefault()
      userMenuOpen = false
      return
    }

    if (!menuElement) return
    const items = Array.from(menuElement.querySelectorAll<HTMLElement>('a, button'))
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0
      items[next]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1
      items[prev]?.focus()
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<nav aria-label="Main navigation" class="navbar border-b border-base-300 bg-base-200 px-4">
  <div class="flex w-full items-center justify-between">
    <div class="flex items-center gap-6">
      <a href={resolve('/')} class="text-lg font-semibold">Chapel Screen</a>
      {#if auth.isAuthenticated}
        <div class="flex gap-4">
          {#each navLinks as link (link.href)}
            {@const isActive = page.url.pathname === link.href}
            <a
              href={link.href}
              class="link link-hover {isActive ? 'font-medium text-primary' : ''}"
              aria-current={isActive ? 'page' : undefined}>
              {link.label}
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-4">
      {#if auth.user}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="dropdown dropdown-end" onkeydown={handleMenuKeydown}>
          <button
            onclick={() => (userMenuOpen = !userMenuOpen)}
            class="btn gap-2 btn-ghost btn-sm"
            aria-expanded={userMenuOpen}
            aria-haspopup="true">
            <span class="font-medium">{auth.user.firstName} {auth.user.lastName}</span>
            <svg class="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {#if userMenuOpen}
            <ul
              bind:this={menuElement}
              role="menu"
              class="dropdown-content menu z-20 mt-1 w-48 rounded-box border border-base-300 bg-base-200 p-2 shadow-lg">
              <li role="none">
                <a role="menuitem" href={resolve('/preferences')} onclick={() => (userMenuOpen = false)}>Preferences</a>
              </li>
              <li role="none">
                <button role="menuitem" onclick={handleLogout} class="text-error">Log out</button>
              </li>
            </ul>
          {/if}
        </div>
      {:else}
        <button onclick={() => auth.redirectToLogin()} class="btn btn-sm btn-ghost">Log in</button>
        <button onclick={() => auth.redirectToRegister()} class="btn btn-sm btn-primary">Register</button>
      {/if}
    </div>
  </div>
</nav>

{@render children()}

<footer class="footer-center footer bg-base-200 p-5 text-base-content">
  <div class="flex gap-4">
    <a href={resolve('/privacy')} class="link link-hover">Privacy</a>
    <a href={resolve('/terms')} class="link link-hover">Terms</a>
    <a href={resolve('/support')} class="link link-hover">Support</a>
  </div>
  <p class="flex">
    <span>&copy; {new Date().getFullYear()}</span>
    <a href="https://nordstack.co.uk" class="link link-primary">NordStack Ltd</a>
  </p>
</footer>
