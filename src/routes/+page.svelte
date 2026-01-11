<script lang="ts">
  import { resolve } from '$app/paths'
  import { page } from '$app/state'

  let { data } = $props()

  const title = 'Chapel Screen - Collaborative Presentations'
  const description =
    'Create real-time collaborative presentations with live sync and presenter mode. Free for freelancers and teams.'
  const url = page.url.origin

  // Svelte action for scroll-triggered animations
  function animateOnScroll(node: HTMLElement) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    )
    observer.observe(node)
    return {
      destroy() {
        observer.disconnect()
      },
    }
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={url} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:site_name" content="Chapel Screen" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
</svelte:head>

<!-- Hero Section -->
<div class="relative overflow-hidden">
  <!-- Background gradient glow -->
  <div
    class="pointer-events-none absolute top-0 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 blur-3xl">
  </div>
  <!-- Dot pattern overlay -->
  <div
    class="pointer-events-none absolute inset-0 -z-10 opacity-30"
    style="background-image: radial-gradient(circle, rgb(100 116 139 / 0.3) 1px, transparent 1px); background-size: 24px 24px;">
  </div>

  <div class="mx-auto max-w-4xl px-6 py-16">
    <div class="animate-fade-in-up text-center">
      <h1
        class="mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
        Collaborative Presentations,<br />Real-Time Sync
      </h1>
      <p class="mx-auto mb-8 max-w-2xl text-lg text-gray-400">
        Create and present content together with your team. Edit in real-time, navigate segment-by-segment in presenter mode, and keep your audience focused.
      </p>

      {#if data.user}
        <a
          href={resolve('/presentations')}
          class="inline-block rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-500">
          My Presentations
        </a>
      {:else}
        <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={resolve('/register')}
            class="w-full rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-500 sm:w-auto">
            Get Started Free
          </a>
          <a
            href={resolve('/login')}
            class="w-full rounded-lg border border-gray-600 px-6 py-3 font-medium text-gray-300 hover:border-gray-500 hover:text-gray-100 sm:w-auto">
            Log In
          </a>
        </div>
        <p class="mt-4 text-sm text-gray-500">No credit card required</p>
      {/if}
    </div>

    <!-- Presentation Editor Preview -->
    <div class="animate-fade-in-up-delay mt-12">
      <div
        class="animate-float mx-auto max-w-2xl rounded-xl border border-gray-700 bg-gray-800/80 p-4 shadow-2xl backdrop-blur-sm">
        <div class="mb-3 flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-red-500/60"></div>
          <div class="h-3 w-3 rounded-full bg-yellow-500/60"></div>
          <div class="h-3 w-3 rounded-full bg-green-500/60"></div>
          <span class="ml-2 text-xs text-gray-500">Presentation Editor</span>
          <span class="ml-auto flex items-center gap-1 text-xs text-green-400">
            <span class="h-2 w-2 rounded-full bg-green-400"></span>
            2 connected
          </span>
        </div>
        <div class="space-y-2">
          <div class="flex items-start gap-2">
            <div class="mt-1 w-1 self-stretch rounded bg-purple-500/30"></div>
            <div class="text-xl font-bold text-gray-100">Q4 Product Roadmap</div>
          </div>
          <div class="flex items-start gap-2">
            <div class="mt-1 w-1 self-stretch rounded bg-blue-500/20"></div>
            <div class="text-sm text-gray-300">Our team has made significant progress this quarter. We shipped three major features and improved performance by 40%.</div>
          </div>
          <div class="flex items-start gap-2">
            <div class="mt-1 w-1 self-stretch rounded bg-blue-500/40"></div>
            <div class="rounded bg-blue-900/30 px-2 py-1 text-sm text-gray-300">The mobile app redesign exceeded expectations with a 25% increase in daily active users.</div>
          </div>
          <div class="flex items-start gap-2">
            <div class="mt-1 w-1 self-stretch rounded bg-blue-500/20"></div>
            <div class="text-sm text-gray-400">Next quarter we'll focus on...</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Features Section -->
<div class="border-y border-gray-700 bg-gray-800/50 py-16">
  <div class="mx-auto max-w-5xl px-6">
    <h2 class="mb-12 text-center text-2xl font-bold text-gray-200">Everything you need for presentations</h2>

    <div class="grid gap-8 md:grid-cols-3">
      <div
        class="animate-fade-in-up rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-600 hover:shadow-lg hover:shadow-purple-900/20">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-100">Real-Time Collaboration</h3>
        <p class="text-gray-400">
          Edit presentations together with your team. Changes sync instantly via peer-to-peer WebRTC connection.
        </p>
      </div>

      <div
        class="animate-fade-in-up animation-delay-100 rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-600 hover:shadow-lg hover:shadow-purple-900/20">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-100">Presenter Mode</h3>
        <p class="text-gray-400">
          Navigate content segment-by-segment with keyboard or click controls. Auto-scroll keeps your audience focused.
        </p>
      </div>

      <div
        class="animate-fade-in-up animation-delay-200 rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-600 hover:shadow-lg hover:shadow-purple-900/20">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-100">Smart Segmentation</h3>
        <p class="text-gray-400">
          Content is automatically segmented with stable IDs. Long paragraphs split into sentences for precise navigation.
        </p>
      </div>
    </div>

    <!-- Second row of features -->
    <div class="mt-8 grid gap-8 md:grid-cols-2 md:px-16">
      <div
        class="animate-fade-in-up animation-delay-300 rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-600 hover:shadow-lg hover:shadow-purple-900/20">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-100">Works Offline</h3>
        <p class="text-gray-400">
          Edit presentations without internet. Changes sync automatically when you're back online.
        </p>
      </div>

      <div
        class="animate-fade-in-up animation-delay-300 rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-600 hover:shadow-lg hover:shadow-purple-900/20">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-100">Install as App</h3>
        <p class="text-gray-400">
          Add to your home screen for a native app experience on mobile and desktop.
        </p>
      </div>
    </div>
  </div>
</div>

<!-- How It Works Section -->
<div class="py-16">
  <div class="mx-auto max-w-4xl px-6">
    <h2 class="mb-12 text-center text-2xl font-bold text-gray-200">How it works</h2>

    <div class="grid gap-8 md:grid-cols-3">
      <div use:animateOnScroll class="animate-on-scroll text-center">
        <div
          class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white transition-transform duration-300 hover:scale-110">
          1
        </div>
        <h3 class="mb-2 font-semibold text-gray-100">Create a presentation</h3>
        <p class="text-sm text-gray-400">
          Start with a blank canvas. Add headings, paragraphs, lists, images, and blockquotes using a rich text editor.
        </p>
      </div>

      <div use:animateOnScroll class="animate-on-scroll animation-delay-100 text-center">
        <div
          class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white transition-transform duration-300 hover:scale-110">
          2
        </div>
        <h3 class="mb-2 font-semibold text-gray-100">Collaborate in real-time</h3>
        <p class="text-sm text-gray-400">
          Share your presentation link. Team members can edit simultaneously with changes syncing instantly.
        </p>
      </div>

      <div use:animateOnScroll class="animate-on-scroll animation-delay-200 text-center">
        <div
          class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white transition-transform duration-300 hover:scale-110">
          3
        </div>
        <h3 class="mb-2 font-semibold text-gray-100">Present with confidence</h3>
        <p class="text-sm text-gray-400">
          Enter presenter mode to navigate segment-by-segment. Use arrow keys or click to advance through your content.
        </p>
      </div>
    </div>
  </div>
</div>

<!-- Rich Editor Features -->
<div class="border-y border-gray-700 bg-gray-800/50 py-16">
  <div class="mx-auto max-w-4xl px-6">
    <h2 class="mb-12 text-center text-2xl font-bold text-gray-200">Rich text editor</h2>

    <div class="grid gap-6 md:grid-cols-2">
      <div use:animateOnScroll class="animate-on-scroll flex items-start gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-purple-400">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </div>
        <div>
          <h3 class="mb-1 font-semibold text-gray-100">Headings &amp; paragraphs</h3>
          <p class="text-sm text-gray-400">Structure your content with multiple heading levels and paragraphs.</p>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex items-start gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-purple-400">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <div>
          <h3 class="mb-1 font-semibold text-gray-100">Bullet &amp; numbered lists</h3>
          <p class="text-sm text-gray-400">Organize information with ordered and unordered lists.</p>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex items-start gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-purple-400">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 class="mb-1 font-semibold text-gray-100">Images</h3>
          <p class="text-sm text-gray-400">Embed images directly in your presentation.</p>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex items-start gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-purple-400">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div>
          <h3 class="mb-1 font-semibold text-gray-100">Blockquotes</h3>
          <p class="text-sm text-gray-400">Highlight important quotes with styled blockquote blocks.</p>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex items-start gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-purple-400">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 class="mb-1 font-semibold text-gray-100">Slide dividers</h3>
          <p class="text-sm text-gray-400">Split your content into multiple slides for multi-page presentations.</p>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex items-start gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-purple-400">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 class="mb-1 font-semibold text-gray-100">Text formatting</h3>
          <p class="text-sm text-gray-400">Bold, italic, underline, strikethrough, code, and links.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Pricing Section -->
<div class="py-16">
  <div class="mx-auto max-w-xl px-6 text-center">
    <h2 class="mb-4 text-2xl font-bold text-gray-200">Simple pricing</h2>
    <p class="mb-8 text-gray-400">Chapel Screen is free to use. No hidden fees, no premium tiers, no limits.</p>

    <div
      use:animateOnScroll
      class="animate-on-scroll rounded-lg border border-gray-700 bg-gray-800 p-8 transition-all duration-300 hover:border-purple-600/50 hover:shadow-lg hover:shadow-purple-900/20">
      <div class="mb-4 text-4xl font-bold text-gray-100">Free</div>
      <p class="mb-6 text-gray-400">Everything included, forever</p>
      <ul class="mb-8 space-y-3 text-left text-gray-300">
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Unlimited presentations
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Real-time collaboration
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Presenter mode
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Smart segmentation
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Rich text editor
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Offline support
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Install as app (PWA)
        </li>
      </ul>
      {#if !data.user}
        <a
          href={resolve('/register')}
          class="block w-full rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-500">
          Get Started Free
        </a>
      {/if}
    </div>
  </div>
</div>

<!-- Final CTA -->
{#if !data.user}
  <div class="border-t border-gray-700 bg-gray-800/50 py-16">
    <div class="mx-auto max-w-2xl px-6 text-center">
      <h2 class="mb-4 text-2xl font-bold text-gray-200">Ready to present?</h2>
      <p class="mb-8 text-gray-400">
        Create collaborative presentations with real-time sync and presenter mode.
      </p>
      <a
        href={resolve('/register')}
        class="inline-block rounded-lg bg-purple-600 px-8 py-3 font-medium text-white hover:bg-purple-500">
        Create Your Free Account
      </a>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8px);
    }
  }

  :global(.animate-fade-in-up) {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  :global(.animate-fade-in-up-delay) {
    opacity: 0;
    animation: fadeInUp 0.6s ease-out 0.3s forwards;
  }

  :global(.animate-float) {
    animation: float 4s ease-in-out infinite;
  }

  :global(.animation-delay-100) {
    animation-delay: 0.1s;
  }

  :global(.animation-delay-200) {
    animation-delay: 0.2s;
  }

  :global(.animation-delay-300) {
    animation-delay: 0.3s;
  }

  /* Scroll-triggered animations - hidden by default */
  :global(.animate-on-scroll) {
    opacity: 0;
    transform: translateY(20px);
    transition:
      opacity 0.6s ease-out,
      transform 0.6s ease-out;
  }

  /* Animate when visible */
  :global(.animate-on-scroll.is-visible) {
    opacity: 1;
    transform: translateY(0);
  }

  /* Staggered delays for visible elements */
  :global(.animate-on-scroll.animation-delay-100.is-visible) {
    transition-delay: 0.1s;
  }

  :global(.animate-on-scroll.animation-delay-200.is-visible) {
    transition-delay: 0.2s;
  }

  :global(.animate-on-scroll.animation-delay-300.is-visible) {
    transition-delay: 0.3s;
  }
</style>
