<script lang="ts">
  import { page } from '$app/state'
  import { resolve } from '$app/paths'
  import { auth } from '$lib/stores/auth.svelte'

  // Redirect to login if not authenticated
  $effect(() => {
    if (auth.ready && !auth.isAuthenticated) {
      auth.redirectToLogin()
    }
  })

  function handleLogout() {
    auth.destroy()
    window.location.href = '/users/log-out'
  }

  let gravatarUrl = $state('')

  async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  $effect(() => {
    const email = auth.user?.email
    if (email) {
      sha256Hex(email.trim().toLowerCase()).then((hash) => {
        gravatarUrl = `https://gravatar.com/avatar/${hash}?s=64&d=mp`
      })
    }
  })

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

<div class="flex min-h-dvh flex-col">
  <div class="sticky top-0 z-50">
    <nav aria-label="Main navigation" class="navbar border-b border-base-300 bg-base-200 px-4">
      <div class="flex w-full items-center justify-between">
        <div class="flex items-center gap-6">
          <a href={resolve('/')} class="flex items-center gap-2 text-lg font-semibold">
            <img src={resolve('/logo.svg')} alt="" class="size-6" />
            Chapel Screen
          </a>
          {#if auth.isAuthenticated}
            <div class="hidden gap-4 sm:flex">
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
                {#if gravatarUrl}
                  <img src={gravatarUrl} alt="" class="size-6 rounded-full" />
                {/if}
                <span class="hero-chevron-down-micro size-4" aria-hidden="true"></span>
              </button>

              {#if userMenuOpen}
                <ul
                  bind:this={menuElement}
                  role="menu"
                  class="dropdown-content menu z-20 mt-1 w-48 rounded-box border border-base-content/20 bg-base-200 p-2 shadow-lg">
                  <li role="none">
                    <a role="menuitem" href={resolve('/preferences')} onclick={() => (userMenuOpen = false)}>
                      <span class="hero-cog-6-tooth-mini size-5" aria-hidden="true"></span>
                      Preferences
                    </a>
                  </li>
                  <li role="none">
                    <button role="menuitem" onclick={handleLogout} class="text-error">
                      <span class="hero-arrow-left-start-on-rectangle-mini size-5" aria-hidden="true"></span>
                      Log out
                    </button>
                  </li>
                </ul>
              {/if}
            </div>
          {:else}
            <button onclick={() => auth.redirectToLogin()} class="btn btn-ghost btn-sm">Log in</button>
            <button onclick={() => auth.redirectToRegister()} class="btn btn-sm btn-primary">Register</button>
          {/if}
        </div>
      </div>
    </nav>
  </div>

  <main class="grow">
    {@render children()}
  </main>

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
</div>
