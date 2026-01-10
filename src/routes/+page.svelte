<script lang="ts">
  import { resolve } from '$app/paths'
  import { page } from '$app/state'

  let { data } = $props()

  const title = 'Elastic Time - Simple Time Tracking for Freelancers and Teams'
  const description =
    'Track your time with ease. Log activities, organize by client and project, add tags and notes. Free time tracking software for freelancers and teams.'
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
  <meta property="og:site_name" content="Elastic Time" />

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
        Track Your Time,<br />Focus on What Matters
      </h1>
      <p class="mx-auto mb-8 max-w-2xl text-lg text-gray-400">
        Elastic Time is a simple, powerful time tracking tool built for freelancers, consultants, and small teams. Log
        your work, organize by client and project, and understand where your time goes.
      </p>

      {#if data.user}
        <a
          href={resolve('/activity')}
          class="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500">
          Go to Activities
        </a>
      {:else}
        <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={resolve('/register')}
            class="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500 sm:w-auto">
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

    <!-- App Preview Mockup -->
    <div class="animate-fade-in-up-delay mt-12">
      <div
        class="animate-float mx-auto max-w-2xl rounded-xl border border-gray-700 bg-gray-800/80 p-4 shadow-2xl backdrop-blur-sm">
        <div class="mb-3 flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-red-500/60"></div>
          <div class="h-3 w-3 rounded-full bg-yellow-500/60"></div>
          <div class="h-3 w-3 rounded-full bg-green-500/60"></div>
          <span class="ml-2 text-xs text-gray-500">Activities</span>
        </div>
        <div class="space-y-2">
          <div class="flex items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2">
            <span class="text-sm text-gray-200">Client meeting - project kickoff</span>
            <span class="ml-auto text-xs text-gray-500">09:00 → 10:30</span>
            <span class="rounded bg-blue-900/50 px-2 py-0.5 text-xs text-blue-300">1h 30m</span>
          </div>
          <div class="flex items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2">
            <span class="text-sm text-gray-200">Frontend development</span>
            <span class="rounded bg-purple-900/50 px-1.5 py-0.5 text-xs text-purple-300">coding</span>
            <span class="ml-auto text-xs text-gray-500">10:45 → 12:30</span>
            <span class="rounded bg-blue-900/50 px-2 py-0.5 text-xs text-blue-300">1h 45m</span>
          </div>
          <div class="flex items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2">
            <span class="text-sm text-gray-200">Code review &amp; PR feedback</span>
            <span class="rounded bg-green-900/50 px-1.5 py-0.5 text-xs text-green-300">review</span>
            <span class="ml-auto text-xs text-gray-500">13:30 → 14:15</span>
            <span class="rounded bg-blue-900/50 px-2 py-0.5 text-xs text-blue-300">45m</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Features Section -->
<div class="border-y border-gray-700 bg-gray-800/50 py-16">
  <div class="mx-auto max-w-5xl px-6">
    <h2 class="mb-12 text-center text-2xl font-bold text-gray-200">Everything you need to track your time</h2>

    <div class="grid gap-8 md:grid-cols-3">
      <div
        class="animate-fade-in-up rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-600 hover:shadow-lg hover:shadow-blue-900/20">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-100">Log Activities</h3>
        <p class="text-gray-400">
          Record what you worked on with start and end times. Add notes and tags to keep everything organized.
        </p>
      </div>

      <div
        class="animate-fade-in-up animation-delay-100 rounded-lg border border-gray-700 bg-gray-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-600 hover:shadow-lg hover:shadow-green-900/20">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-600/20 text-green-400">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-100">Manage Clients</h3>
        <p class="text-gray-400">
          Organize your work by client and project. Keep track of who you're working for and what you're working on.
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-100">Reports &amp; Insights</h3>
        <p class="text-gray-400">
          View your activities grouped by week and day. See charts showing how much time you've spent and where it went.
        </p>
      </div>
    </div>
  </div>
</div>

<!-- Reports Chart Preview -->
<div class="py-16">
  <div class="mx-auto max-w-4xl px-6">
    <div class="mb-8 text-center">
      <h2 class="mb-4 text-2xl font-bold text-gray-200">Visualize your time</h2>
      <p class="text-gray-400">Interactive charts show exactly where your hours go each week</p>
    </div>

    <div use:animateOnScroll class="animate-on-scroll">
      <div
        class="mx-auto max-w-2xl rounded-xl border border-gray-700 bg-gray-800/80 p-4 shadow-2xl backdrop-blur-sm">
        <div class="mb-3 flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-red-500/60"></div>
          <div class="h-3 w-3 rounded-full bg-yellow-500/60"></div>
          <div class="h-3 w-3 rounded-full bg-green-500/60"></div>
          <span class="ml-2 text-xs text-gray-500">Reports</span>
        </div>

        <!-- Summary stats -->
        <div class="mb-4 grid grid-cols-3 gap-3">
          <div class="rounded-lg bg-gray-900/50 p-3 text-center">
            <div class="text-xl font-bold text-blue-400">42.5h</div>
            <div class="text-xs text-gray-500">Total Hours</div>
          </div>
          <div class="rounded-lg bg-gray-900/50 p-3 text-center">
            <div class="text-xl font-bold text-green-400">8.5h</div>
            <div class="text-xs text-gray-500">Avg / Day</div>
          </div>
          <div class="rounded-lg bg-gray-900/50 p-3 text-center">
            <div class="text-xl font-bold text-purple-400">$6,375</div>
            <div class="text-xs text-gray-500">Billable</div>
          </div>
        </div>

        <!-- Charts row -->
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Bar chart mockup -->
          <div class="rounded-lg bg-gray-900/50 p-4">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-xs text-gray-400">Hours per day</span>
              <span class="text-xs text-gray-500">Dec 30 - Jan 10</span>
            </div>
            <div class="flex items-end gap-1.5 h-28 pt-4">
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[72px]"></div>
                <span class="text-xs text-gray-500 mt-1">M</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[84px]"></div>
                <span class="text-xs text-gray-500 mt-1">T</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[90px]"></div>
                <span class="text-xs text-gray-500 mt-1">W</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[76px]"></div>
                <span class="text-xs text-gray-500 mt-1">T</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[64px]"></div>
                <span class="text-xs text-gray-500 mt-1">F</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-purple-800 to-purple-600 h-[24px]"></div>
                <span class="text-xs text-gray-500 mt-1">S</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-purple-800 to-purple-600 h-[14px]"></div>
                <span class="text-xs text-gray-500 mt-1">S</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[80px]"></div>
                <span class="text-xs text-gray-500 mt-1">M</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[88px]"></div>
                <span class="text-xs text-gray-500 mt-1">T</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[74px]"></div>
                <span class="text-xs text-gray-500 mt-1">W</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[96px]"></div>
                <span class="text-xs text-gray-500 mt-1">T</span>
              </div>
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full rounded-t bg-gradient-to-t from-blue-800 to-blue-600 h-[62px]"></div>
                <span class="text-xs text-gray-500 mt-1">F</span>
              </div>
            </div>
          </div>

          <!-- Pie chart mockup -->
          <div class="rounded-lg bg-gray-900/50 p-4">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-xs text-gray-400">Hours by project</span>
            </div>
            <div class="flex items-center gap-4">
              <div
                class="relative h-24 w-24 shrink-0 rounded-full"
                style="background: conic-gradient(#3b82f6 0deg 158deg, #8b5cf6 158deg 252deg, #10b981 252deg 324deg, #64748b 324deg 360deg);">
                <div
                  class="absolute inset-0 rounded-full"
                  style="background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.3) 100%);">
                </div>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-sm bg-blue-500"></div>
                  <span class="text-gray-400">Website Redesign</span>
                  <span class="text-gray-500 ml-auto">18.5h</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-sm bg-purple-500"></div>
                  <span class="text-gray-400">Mobile App</span>
                  <span class="text-gray-500 ml-auto">11h</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></div>
                  <span class="text-gray-400">API Integration</span>
                  <span class="text-gray-500 ml-auto">8.5h</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-sm bg-slate-500"></div>
                  <span class="text-gray-400">Other</span>
                  <span class="text-gray-500 ml-auto">4.5h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Invoice Preview -->
<div class="border-y border-gray-700 bg-gray-800/50 py-16">
  <div class="mx-auto max-w-4xl px-6">
    <div class="mb-8 text-center">
      <h2 class="mb-4 text-2xl font-bold text-gray-200">Professional invoices in seconds</h2>
      <p class="text-gray-400">Generate PDF invoices directly from your tracked time</p>
    </div>

    <div use:animateOnScroll class="animate-on-scroll">
      <div
        class="mx-auto max-w-md rounded-xl border border-gray-700 bg-white p-6 shadow-2xl">
        <!-- Invoice header -->
        <div class="mb-6 flex items-start justify-between">
          <div>
            <div class="text-xl font-bold text-gray-900">INVOICE</div>
            <div class="text-sm text-gray-500">#INV-2024-001</div>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium text-gray-900">Your Company</div>
            <div class="text-xs text-gray-500">123 Main Street</div>
            <div class="text-xs text-gray-500">New York, NY 10001</div>
          </div>
        </div>

        <!-- Bill to -->
        <div class="mb-6">
          <div class="text-xs font-medium text-gray-500 uppercase">Bill To</div>
          <div class="text-sm font-medium text-gray-900">Acme Corporation</div>
          <div class="text-xs text-gray-500">456 Business Ave, Suite 100</div>
        </div>

        <!-- Line items -->
        <div class="mb-6 border-t border-b border-gray-200 py-3">
          <div class="mb-2 flex justify-between text-xs font-medium text-gray-500 uppercase">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-700">Website Redesign - January</span>
              <span class="font-medium text-gray-900">$4,500.00</span>
            </div>
            <div class="flex justify-between text-xs text-gray-500">
              <span>30 hours @ $150/hr</span>
              <span></span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-700">API Integration - Phase 1</span>
              <span class="font-medium text-gray-900">$1,875.00</span>
            </div>
            <div class="flex justify-between text-xs text-gray-500">
              <span>15 hours @ $125/hr</span>
              <span></span>
            </div>
          </div>
        </div>

        <!-- Totals -->
        <div class="space-y-1 text-right">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Subtotal</span>
            <span class="text-gray-900">$6,375.00</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Tax (10%)</span>
            <span class="text-gray-900">$637.50</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
            <span class="text-gray-900">Total</span>
            <span class="text-blue-600">$7,012.50</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- How It Works Section -->
<div class="py-16">
  <div class="mx-auto max-w-4xl px-6">
    <h2 class="mb-12 text-center text-2xl font-bold text-gray-200">How it works</h2>

    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
      <div use:animateOnScroll class="animate-on-scroll text-center">
        <div
          class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white transition-transform duration-300 hover:scale-110">
          1
        </div>
        <h3 class="mb-2 font-semibold text-gray-100">Create your account</h3>
        <p class="text-sm text-gray-400">
          Sign up in seconds with just your email. No credit card or payment required.
        </p>
      </div>

      <div use:animateOnScroll class="animate-on-scroll animation-delay-100 text-center">
        <div
          class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white transition-transform duration-300 hover:scale-110">
          2
        </div>
        <h3 class="mb-2 font-semibold text-gray-100">Set up clients &amp; projects</h3>
        <p class="text-sm text-gray-400">
          Add your clients and their projects to organize your work. Or jump straight into logging time.
        </p>
      </div>

      <div use:animateOnScroll class="animate-on-scroll animation-delay-200 text-center">
        <div
          class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white transition-transform duration-300 hover:scale-110">
          3
        </div>
        <h3 class="mb-2 font-semibold text-gray-100">Track your time</h3>
        <p class="text-sm text-gray-400">
          Log activities as you work. Add descriptions, tags, and notes to stay organized.
        </p>
      </div>

      <div use:animateOnScroll class="animate-on-scroll animation-delay-300 text-center">
        <div
          class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white transition-transform duration-300 hover:scale-110">
          4
        </div>
        <h3 class="mb-2 font-semibold text-gray-100">Report &amp; bill</h3>
        <p class="text-sm text-gray-400">
          Generate reports with billing totals. Export to PDF or CSV for easy invoicing.
        </p>
      </div>
    </div>
  </div>
</div>

<!-- Detailed Features Section -->
<div class="border-y border-gray-700 bg-gray-800/50 py-16">
  <div class="mx-auto max-w-4xl px-6">
    <h2 class="mb-12 text-center text-2xl font-bold text-gray-200">Built for how you work</h2>

    <div class="space-y-12">
      <div use:animateOnScroll class="animate-on-scroll flex flex-col gap-6 md:flex-row md:items-center">
        <div class="flex-1">
          <h3 class="mb-2 text-lg font-semibold text-gray-100">Smart autocomplete</h3>
          <p class="text-gray-400">
            Elastic Time learns from your history. Descriptions, projects, and tags autocomplete as you type, making
            logging repeat tasks effortless.
          </p>
        </div>
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-gray-400 transition-all duration-300 hover:bg-gray-600 hover:text-blue-400">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex flex-col gap-6 md:flex-row-reverse md:items-center">
        <div class="flex-1">
          <h3 class="mb-2 text-lg font-semibold text-gray-100">Inline editing</h3>
          <p class="text-gray-400">
            Made a mistake? Edit any field directly in your activity list. Changes save automatically as you type. No
            forms, no friction.
          </p>
        </div>
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-gray-400 transition-all duration-300 hover:bg-gray-600 hover:text-green-400">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex flex-col gap-6 md:flex-row md:items-center">
        <div class="flex-1">
          <h3 class="mb-2 text-lg font-semibold text-gray-100">Team collaboration</h3>
          <p class="text-gray-400">
            Invite colleagues to work on your clients. See their logged time alongside yours in reports. Perfect for
            small teams and agencies.
          </p>
        </div>
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-gray-400 transition-all duration-300 hover:bg-gray-600 hover:text-purple-400">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex flex-col gap-6 md:flex-row-reverse md:items-center">
        <div class="flex-1">
          <h3 class="mb-2 text-lg font-semibold text-gray-100">Visual reports</h3>
          <p class="text-gray-400">
            See your time at a glance with charts showing hours per day or week. Filter by date range, client, project,
            or team member.
          </p>
        </div>
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-gray-400 transition-all duration-300 hover:bg-gray-600 hover:text-yellow-400">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex flex-col gap-6 md:flex-row md:items-center">
        <div class="flex-1">
          <h3 class="mb-2 text-lg font-semibold text-gray-100">Contracts &amp; phases</h3>
          <p class="text-gray-400">
            Set up contracts with billing rates and currencies. Define phases for billing periods that automatically
            calculate totals from your logged activities.
          </p>
        </div>
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-gray-400 transition-all duration-300 hover:bg-gray-600 hover:text-cyan-400">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex flex-col gap-6 md:flex-row-reverse md:items-center">
        <div class="flex-1">
          <h3 class="mb-2 text-lg font-semibold text-gray-100">Professional invoices</h3>
          <p class="text-gray-400">
            Generate PDF invoices directly from your phases. Customize with your company details, client billing
            info, and tax settings. Download and send to clients in seconds.
          </p>
        </div>
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-gray-400 transition-all duration-300 hover:bg-gray-600 hover:text-emerald-400">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div use:animateOnScroll class="animate-on-scroll flex flex-col gap-6 md:flex-row md:items-center">
        <div class="flex-1">
          <h3 class="mb-2 text-lg font-semibold text-gray-100">Import &amp; export</h3>
          <p class="text-gray-400">
            Export your activities to CSV for backup or analysis. Import from other tools with flexible CSV parsing that
            handles multiple date formats and timezones.
          </p>
        </div>
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-700 text-gray-400 transition-all duration-300 hover:bg-gray-600 hover:text-orange-400">
          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Pricing Section -->
<div class="py-16">
  <div class="mx-auto max-w-xl px-6 text-center">
    <h2 class="mb-4 text-2xl font-bold text-gray-200">Simple pricing</h2>
    <p class="mb-8 text-gray-400">Elastic Time is free to use. No hidden fees, no premium tiers, no limits.</p>

    <div
      use:animateOnScroll
      class="animate-on-scroll rounded-lg border border-gray-700 bg-gray-800 p-8 transition-all duration-300 hover:border-blue-600/50 hover:shadow-lg hover:shadow-blue-900/20">
      <div class="mb-4 text-4xl font-bold text-gray-100">Free</div>
      <p class="mb-6 text-gray-400">Everything included, forever</p>
      <ul class="mb-8 space-y-3 text-left text-gray-300">
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Unlimited activities
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Unlimited clients &amp; projects
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Contracts &amp; billing rates
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          PDF invoices
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Team collaboration
        </li>
        <li class="flex items-center gap-2">
          <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Reports &amp; CSV export
        </li>
      </ul>
      {#if !data.user}
        <a
          href={resolve('/register')}
          class="block w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500">
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
      <h2 class="mb-4 text-2xl font-bold text-gray-200">Ready to take control of your time?</h2>
      <p class="mb-8 text-gray-400">
        Join freelancers and teams who use Elastic Time to understand where their hours go.
      </p>
      <a
        href={resolve('/register')}
        class="inline-block rounded-lg bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-500">
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
