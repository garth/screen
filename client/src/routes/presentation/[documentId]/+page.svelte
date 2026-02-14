<script lang="ts">
  import { onDestroy } from 'svelte'
  import { page } from '$app/state'
  import {
    createPresentationDoc,
    createThemeDoc,
    createPresenterAwarenessDoc,
    type ThemeDocument,
    type PersistentPresenterState,
  } from '$lib/stores/documents'
  import PresentationViewer from '$lib/components/presentation/PresentationViewer.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'
  import { parseContentSegments, type ContentSegment } from '$lib/utils/segment-parser'

  const documentId = page.params.documentId!

  // Create presentation document store
  const doc = createPresentationDoc({
    documentId,
  })

  // Create persistent presenter awareness (viewer has read-only access)
  const presenterAwareness = createPresenterAwarenessDoc({
    documentId,
    canWrite: false,
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

  // Parse content into segments for follow mode
  // Include contentVersion in dependency to trigger re-parse when content changes
  const segments: ContentSegment[] = $derived(doc.synced ? parseContentSegments(doc.content, doc.contentVersion) : [])

  // Follow mode state
  let followMode = $state(true)
  let activePresenter = $state<PersistentPresenterState | null>(null)
  let currentSegmentId = $state<string | null>(null)

  // Subscribe to presenter changes via persistent awareness
  $effect(() => {
    if (presenterAwareness.synced) {
      const unsubscribe = presenterAwareness.onPresenterChange((presenter) => {
        activePresenter = presenter

        // Auto-follow if enabled
        if (followMode && presenter?.segmentId) {
          currentSegmentId = presenter.segmentId
        }
      })
      return unsubscribe
    }
  })

  // Default to persisted position or first segment
  $effect(() => {
    if (doc.synced && presenterAwareness.synced && segments.length > 0 && currentSegmentId === null) {
      const presenter = presenterAwareness.getPresenter()
      if (presenter?.segmentId) {
        const segmentExists = segments.some((s) => s.id === presenter.segmentId)
        if (segmentExists) {
          currentSegmentId = presenter.segmentId
          return
        }
      }
      currentSegmentId = segments[0].id
    }
  })

  // Derived: are we actively following someone?
  const isFollowing = $derived(followMode && activePresenter !== null)

  // Track if we have an active presentation state (either following or had a presenter)
  const hasActiveState = $derived(currentSegmentId !== null)

  onDestroy(() => {
    themeDoc?.destroy()
    presenterAwareness.destroy()
    doc.destroy()
  })
</script>

<svelte:head>
  <title>{doc.synced ? doc.title || 'Presentation' : 'Loading...'} - Presentation</title>
</svelte:head>

<div class="h-screen">
  {#if doc.error}
    <div class="flex h-full flex-col items-center justify-center gap-4">
      <h1 class="text-2xl font-bold">Presentation not found</h1>
      <p class="text-base-content/70">This presentation doesn't exist or you don't have access to it.</p>
    </div>
  {:else if doc.synced}
    <PresentationViewer
      content={doc.content}
      theme={resolvedTheme}
      mode={hasActiveState ? 'follow' : 'view'}
      format={doc.format}
      {segments}
      {currentSegmentId} />
  {:else}
    <div class="flex h-full items-center justify-center">
      <span class="loading loading-lg loading-spinner" role="status" aria-label="Loading"></span>
    </div>
  {/if}
</div>
