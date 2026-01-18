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
  const segments: ContentSegment[] = $derived(doc.synced ? parseContentSegments(doc.content) : [])

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

  // Derived: are we following someone?
  const isFollowing = $derived(followMode && activePresenter !== null)

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
      mode={isFollowing ? 'present' : 'view'}
      segments={isFollowing ? segments : []}
      currentSegmentId={isFollowing ? currentSegmentId : null} />
  {:else}
    <div class="flex h-full items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {/if}
</div>
