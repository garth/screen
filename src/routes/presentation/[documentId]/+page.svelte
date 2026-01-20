<script lang="ts">
  import { onDestroy } from 'svelte'
  import { createPresentationDoc, createThemeDoc, type ThemeDocument } from '$lib/stores/documents'
  import PresentationViewer from '$lib/components/presentation/PresentationViewer.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'
  import { parseContentSegments, type ContentSegment } from '$lib/utils/segment-parser'
  import type { PresenterState } from '$lib/stores/documents/awareness.svelte'

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

  // Parse content into segments for follow mode
  // Include contentVersion in dependency to trigger re-parse when content changes
  const segments: ContentSegment[] = $derived(
    doc.synced ? parseContentSegments(doc.content, doc.contentVersion) : [],
  )

  // Follow mode state
  let followMode = $state(true)
  let activePresenter = $state<PresenterState | null>(null)
  let currentSegmentId = $state<string | null>(null)

  // Subscribe to presenter changes on the shared channel
  $effect(() => {
    if (doc.synced) {
      const unsubscribe = doc.awareness.onPresenterChange((presenter) => {
        activePresenter = presenter

        // Auto-follow if enabled
        if (followMode && presenter?.segmentId) {
          currentSegmentId = presenter.segmentId
        }
      })
      return unsubscribe
    }
  })

  // Default to first segment if no position is set
  $effect(() => {
    if (doc.synced && segments.length > 0 && currentSegmentId === null) {
      currentSegmentId = segments[0].id
    }
  })

  // Derived: are we actively following someone?
  const isFollowing = $derived(followMode && activePresenter !== null)

  // Track if we have an active presentation state (either following or had a presenter)
  const hasActiveState = $derived(currentSegmentId !== null)

  onDestroy(() => {
    themeDoc?.destroy()
    doc.destroy()
  })
</script>

<svelte:head>
  <title>{data.document.title} - Presentation</title>
</svelte:head>

<div class="h-screen">
  {#if doc.synced}
    <PresentationViewer
      content={doc.content}
      theme={resolvedTheme}
      mode={hasActiveState ? 'follow' : 'view'}
      format={doc.format}
      {segments}
      {currentSegmentId} />
  {:else}
    <div class="flex h-full items-center justify-center">
      <span class="loading loading-lg loading-spinner"></span>
    </div>
  {/if}
</div>
