<script lang="ts">
  import { onDestroy } from 'svelte'
  import { browser } from '$app/environment'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import { auth } from '$lib/stores/auth.svelte'
  import {
    createPresentationDoc,
    createPresenterAwarenessDoc,
  } from '$lib/stores/documents'
  import type { PresentationFormat } from '$lib/stores/documents/types'
  import PresentationViewer from '$lib/components/presentation/PresentationViewer.svelte'
  import OptionsPopup from '$lib/components/presentation/OptionsPopup.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'
  import { parseContentSegments, clampSegmentIndex, type ContentSegment } from '$lib/utils/segment-parser'
  import { createThemeLoader } from '$lib/utils/theme-loader.svelte'

  const documentId = page.params.documentId!

  // Create presentation document store
  const doc = createPresentationDoc({
    documentId,
  })

  // Create persistent presenter awareness (presenter has write access)
  const presenterAwareness = createPresenterAwarenessDoc({
    documentId,
    canWrite: true,
  })

  // Theme document (loaded when themeId is available)
  const themeLoader = createThemeLoader({
    getSynced: () => doc.synced,
    getThemeId: () => doc.themeId,
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
        themeLoader.current?.synced ? themeLoader.current : null,
      )
    : defaultTheme,
  )

  // Parse content into segments for navigation
  // Include contentVersion in dependency to trigger re-parse when content changes
  const segments: ContentSegment[] = $derived(doc.synced ? parseContentSegments(doc.content, doc.contentVersion) : [])

  // Track by STABLE segment ID (not index)
  let currentSegmentId = $state<string | null>(null)

  // Track last local update timestamp to prevent feedback loops
  let lastLocalUpdate = $state(0)

  // Track the previous segment index for handling deletions
  let previousSegmentIndex = $state(-1)

  // Initialize segment position when synced
  // Priority: 1) persistent awareness position, 2) first segment
  $effect(() => {
    console.log(
      '[Presenter Init] doc.synced:',
      doc.synced,
      'presenterAwareness.synced:',
      presenterAwareness.synced,
      'segments.length:',
      segments.length,
      'currentSegmentId:',
      currentSegmentId,
    )
    if (doc.synced && presenterAwareness.synced && segments.length > 0 && !currentSegmentId) {
      // Check if there's an existing presenter position in persistent awareness
      const existingPresenter = presenterAwareness.getPresenter()
      console.log('[Presenter Init] Checking for existing presenter:', existingPresenter)
      if (existingPresenter?.segmentId) {
        // Verify the segment still exists
        const segmentExists = segments.some((s) => s.id === existingPresenter.segmentId)
        console.log('[Presenter Init] Segment exists:', segmentExists)
        if (segmentExists) {
          console.log('[Presenter Init] Restoring to:', existingPresenter.segmentId)
          currentSegmentId = existingPresenter.segmentId
          return
        }
      }
      // Fallback to first segment
      console.log('[Presenter Init] Defaulting to first segment:', segments[0].id)
      currentSegmentId = segments[0].id
    }
  })

  // Handle segment deletion - move to next/previous segment if current is deleted
  $effect(() => {
    if (!currentSegmentId || segments.length === 0) return

    // Check if current segment still exists
    const currentIndex = segments.findIndex((s) => s.id === currentSegmentId)

    if (currentIndex === -1) {
      // Current segment was deleted - try to find the best replacement
      // Use the previous index to determine which segment to select
      let newIndex = previousSegmentIndex

      // Clamp to valid range
      if (newIndex >= segments.length) {
        newIndex = segments.length - 1
      }
      if (newIndex < 0) {
        newIndex = 0
      }

      const newSegmentId = segments[newIndex]?.id ?? null
      if (newSegmentId) {
        currentSegmentId = newSegmentId
        lastLocalUpdate = Date.now()
        presenterAwareness.setPresenter(newSegmentId)
      }
    } else {
      // Update previous index for next time
      previousSegmentIndex = currentIndex
    }
  })

  // Broadcast position to persistent awareness when synced
  $effect(() => {
    console.log(
      '[Presenter Broadcast] presenterAwareness.synced:',
      presenterAwareness.synced,
      'currentSegmentId:',
      currentSegmentId,
    )
    if (presenterAwareness.synced && currentSegmentId) {
      console.log('[Presenter Broadcast] Broadcasting position:', currentSegmentId)
      lastLocalUpdate = Date.now()
      presenterAwareness.setPresenter(currentSegmentId)
    }
  })

  // Subscribe to other presenters' navigation via persistent awareness
  $effect(() => {
    if (presenterAwareness.synced) {
      const unsubscribe = presenterAwareness.onPresenterChange((presenter) => {
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
      presenterAwareness.setPresenter(newSegmentId)
    }
  }

  // Handle navigation by ID (for clicks)
  function handleNavigateById(segmentId: string) {
    if (segmentId !== currentSegmentId) {
      currentSegmentId = segmentId
      lastLocalUpdate = Date.now()
      presenterAwareness.setPresenter(segmentId)
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
    // DO NOT call clearPresenter() - let position persist for reconnection
    themeLoader.destroy()
    presenterAwareness.destroy()
    doc.destroy()
  })

  // Options popup state
  let showOptionsPopup = $state(false)

  // Themes from auth store (live updates via user channel)
  const themes = $derived(auth.themes.map((t) => ({ id: t.id, name: t.name, isSystemTheme: t.isSystemTheme })))

  function handleThemeChange(themeId: string | null) {
    if (doc.synced) {
      doc.setThemeId(themeId)
    }
  }

  function handleFormatChange(format: PresentationFormat) {
    if (doc.synced) {
      doc.setFormat(format)
    }
  }
</script>

<svelte:head>
  <title>{doc.synced ? doc.title || 'Presenter' : 'Loading...'} - Presenter</title>
</svelte:head>

<div class="flex h-screen flex-col">
  <!-- Header -->
  <header class="navbar min-h-0 border-b border-base-300 bg-base-200 px-4 py-2">
    <div class="flex-1">
      <h1 class="text-lg font-medium">
        {doc.synced && doc.title ? doc.title : 'Untitled'}
      </h1>
    </div>

    <div class="flex flex-none items-center gap-3">
      <button
        type="button"
        onclick={() => (showOptionsPopup = true)}
        disabled={!doc.synced}
        class="btn btn-ghost btn-sm">
        Options
      </button>
      <a href={resolve(`/presentation/${documentId}`)} class="btn btn-ghost btn-sm">View</a>
      <a href={resolve(`/presentation/${documentId}/edit`)} class="btn btn-ghost btn-sm">Edit</a>
    </div>
  </header>

  <main class="relative flex-1 overflow-hidden">
    {#if doc.error}
      <div class="flex h-full flex-col items-center justify-center gap-4">
        <h2 class="text-2xl font-bold">Presentation not found</h2>
        <p class="text-base-content/70">This presentation doesn't exist or you don't have access to it.</p>
      </div>
    {:else if doc.synced}
      <PresentationViewer
        content={doc.content}
        theme={resolvedTheme}
        mode="present"
        format={doc.format}
        {segments}
        {currentSegmentId}
        onSegmentClick={handleNavigateById} />

      <!-- Floating Navigation Buttons -->
      <div class="nav-buttons">
        <button
          type="button"
          onclick={() => handleNavigateByIndex(currentSegmentIndex - 1)}
          disabled={currentSegmentIndex <= 0}
          aria-label="Previous segment"
          class="btn btn-circle border-base-300 bg-base-100/80 shadow-lg backdrop-blur-sm btn-lg hover:bg-base-100 disabled:cursor-not-allowed disabled:opacity-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onclick={() => handleNavigateByIndex(currentSegmentIndex + 1)}
          disabled={currentSegmentIndex >= segments.length - 1}
          aria-label="Next segment"
          class="btn btn-circle border-base-300 bg-base-100/80 shadow-lg backdrop-blur-sm btn-lg hover:bg-base-100 disabled:cursor-not-allowed disabled:opacity-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    {:else}
      <div class="flex h-full items-center justify-center">
        <span class="loading loading-lg loading-spinner" role="status" aria-label="Loading"></span>
      </div>
    {/if}
  </main>
</div>

<!-- Options Popup -->
{#if showOptionsPopup}
  <OptionsPopup
    open={showOptionsPopup}
    {themes}
    currentThemeId={doc.themeId}
    currentFormat={doc.format}
    disabled={!doc.synced}
    onThemeChange={handleThemeChange}
    onFormatChange={handleFormatChange}
    onClose={() => (showOptionsPopup = false)} />
{/if}

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
