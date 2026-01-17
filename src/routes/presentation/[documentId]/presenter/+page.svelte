<script lang="ts">
  import { onDestroy } from 'svelte'
  import { browser } from '$app/environment'
  import { resolve } from '$app/paths'
  import { createPresentationDoc, createThemeDoc, type ThemeDocument } from '$lib/stores/documents'
  import PresentationViewer from '$lib/components/presentation/PresentationViewer.svelte'
  import PresenterControls from '$lib/components/presentation/PresenterControls.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'
  import { parseContentSegments, clampSegmentIndex, type ContentSegment } from '$lib/utils/segment-parser'

  let { data } = $props()

  // Create presentation document store
  const doc = createPresentationDoc({
    documentId: data.document.id,
    baseDocumentId: data.document.baseDocumentId ?? undefined,
  })

  // Theme document (loaded when themeId is available)
  let themeDoc = $state<ThemeDocument | null>(null)

  // Load theme when presentation syncs and has a themeId
  $effect(() => {
    if (doc.synced && doc.themeId) {
      themeDoc?.destroy()
      themeDoc = createThemeDoc({ documentId: doc.themeId })
    } else if (doc.synced && !doc.themeId) {
      themeDoc?.destroy()
      themeDoc = null
    }
  })

  // Compute resolved theme
  const resolvedTheme: ResolvedTheme = $derived(
    doc.synced ?
      resolveTheme(
        {
          font: doc.font,
          backgroundColor: doc.backgroundColor,
          textColor: doc.textColor,
        },
        themeDoc?.synced ? themeDoc : null,
      )
    : defaultTheme,
  )

  // Parse content into segments for navigation
  const segments: ContentSegment[] = $derived(doc.synced ? parseContentSegments(doc.content) : [])

  // Track by STABLE segment ID (not index)
  let currentSegmentId = $state<string | null>(null)

  // Track last local update timestamp to prevent feedback loops
  let lastLocalUpdate = $state(0)

  // Initialize to first segment when segments are available
  $effect(() => {
    if (segments.length > 0 && !currentSegmentId) {
      currentSegmentId = segments[0].id
    }
  })

  // Join as presenter on shared awareness channel when synced
  $effect(() => {
    if (doc.synced && currentSegmentId) {
      lastLocalUpdate = Date.now()
      doc.awareness.setPresenter(currentSegmentId)
    }
  })

  // Subscribe to other presenters' navigation on the shared channel
  $effect(() => {
    if (doc.synced) {
      const unsubscribe = doc.awareness.onPresenterChange((presenter) => {
        // Ignore our own updates (prevent feedback loop)
        if (!presenter || presenter.timestamp <= lastLocalUpdate) return

        // Another presenter navigated - sync to their position
        if (presenter.segmentId && presenter.segmentId !== currentSegmentId) {
          currentSegmentId = presenter.segmentId
        }
      })
      return unsubscribe
    }
  })

  // Derive current index from ID (for display)
  const currentSegmentIndex = $derived(segments.findIndex((s) => s.id === currentSegmentId))

  // Handle navigation by index (for keyboard/controls)
  function handleNavigateByIndex(index: number) {
    const clampedIndex = clampSegmentIndex(index, segments.length)
    const newSegmentId = segments[clampedIndex]?.id ?? null
    if (newSegmentId && newSegmentId !== currentSegmentId) {
      currentSegmentId = newSegmentId
      lastLocalUpdate = Date.now()
      doc.awareness.setPresenter(newSegmentId)
    }
  }

  // Handle navigation by ID (for clicks)
  function handleNavigateById(segmentId: string) {
    if (segmentId !== currentSegmentId) {
      currentSegmentId = segmentId
      lastLocalUpdate = Date.now()
      doc.awareness.setPresenter(segmentId)
    }
  }

  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        handleNavigateByIndex(currentSegmentIndex - 1)
        break
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        event.preventDefault()
        handleNavigateByIndex(currentSegmentIndex + 1)
        break
      case 'Home':
        event.preventDefault()
        handleNavigateByIndex(0)
        break
      case 'End':
        event.preventDefault()
        handleNavigateByIndex(segments.length - 1)
        break
      case 'Escape':
        // Could exit fullscreen or go back
        break
    }
  }

  // Add keyboard listener
  $effect(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeydown)
      return () => {
        window.removeEventListener('keydown', handleKeydown)
      }
    }
  })

  onDestroy(() => {
    doc.awareness.clearPresenter()
    themeDoc?.destroy()
    doc.destroy()
  })
</script>

<svelte:head>
  <title>{data.document.title} - Presenter</title>
</svelte:head>

<div class="flex h-screen bg-base-300">
  <!-- Main Presentation View -->
  <div class="flex flex-1 flex-col">
    <!-- Header -->
    <header class="navbar bg-base-200 border-b border-base-300 min-h-0 px-4 py-2">
      <div class="flex-1">
        <h1 class="text-lg font-medium">
          {doc.synced && doc.title ? doc.title : data.document.title || 'Untitled'}
        </h1>
      </div>

      <div class="flex-none text-sm text-base-content/50">
        <span>Use arrow keys to navigate</span>
      </div>
    </header>

    <!-- Viewer -->
    <main class="relative flex-1 overflow-hidden">
      {#if doc.synced}
        <PresentationViewer
          content={doc.content}
          theme={resolvedTheme}
          mode="present"
          {segments}
          {currentSegmentId}
          onSegmentClick={handleNavigateById} />

        <!-- Floating Navigation Buttons -->
        <div class="nav-buttons">
          <button
            type="button"
            onclick={() => handleNavigateByIndex(currentSegmentIndex - 1)}
            disabled={currentSegmentIndex <= 0}
            class="btn btn-lg btn-circle bg-base-100/80 hover:bg-base-100 backdrop-blur-sm shadow-lg border-base-300 disabled:cursor-not-allowed disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onclick={() => handleNavigateByIndex(currentSegmentIndex + 1)}
            disabled={currentSegmentIndex >= segments.length - 1}
            class="btn btn-lg btn-circle bg-base-100/80 hover:bg-base-100 backdrop-blur-sm shadow-lg border-base-300 disabled:cursor-not-allowed disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      {:else}
        <div class="flex h-full items-center justify-center">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      {/if}
    </main>
  </div>

  <!-- Sidebar with Controls -->
  <aside class="w-80 border-l border-base-300 bg-base-200 p-4">
    {#if doc.synced && segments.length > 0}
      <PresenterControls
        {segments}
        currentIndex={currentSegmentIndex}
        onNavigate={handleNavigateByIndex}
        onNavigateById={handleNavigateById} />
    {:else if doc.synced}
      <div class="text-center text-base-content/50">
        <p>No content segments found.</p>
        <p class="mt-2 text-sm">Add content to your presentation.</p>
      </div>
    {:else}
      <div class="text-center text-base-content/50">
        <span class="loading loading-spinner loading-md"></span>
      </div>
    {/if}
  </aside>
</div>

<style>
  .nav-buttons {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 1rem;
    z-index: 50;
  }
</style>
