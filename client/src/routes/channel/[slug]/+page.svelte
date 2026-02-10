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

  const slug = page.params.slug!

  // Channel data loaded from API
  let channelData = $state<{
    presentationId: string
    themeOverrideId?: string
  } | null>(null)
  let loading = $state(true)
  let errorMessage = $state<string | null>(null)

  // Load channel data by slug
  $effect(() => {
    async function loadChannel() {
      try {
        const resp = await fetch(`/api/channel/${slug}`)
        if (!resp.ok) {
          errorMessage = resp.status === 404 ? 'Channel not found' : 'Failed to load channel'
          loading = false
          return
        }
        const data = await resp.json()
        channelData = data
        loading = false
      } catch {
        errorMessage = 'Failed to load channel'
        loading = false
      }
    }
    loadChannel()
  })

  // Presentation document (loaded once channel data is available)
  let doc = $state<ReturnType<typeof createPresentationDoc> | null>(null)
  let presenterAwareness = $state<ReturnType<typeof createPresenterAwarenessDoc> | null>(null)
  let themeDoc = $state<ThemeDocument | null>(null)

  $effect(() => {
    if (channelData?.presentationId && !doc) {
      doc = createPresentationDoc({ documentId: channelData.presentationId })
      presenterAwareness = createPresenterAwarenessDoc({
        documentId: channelData.presentationId,
        canWrite: false,
      })
    }
  })

  // Load theme when presentation syncs
  $effect(() => {
    if (doc?.synced) {
      const themeId = channelData?.themeOverrideId || doc.themeId
      if (themeId) {
        themeDoc?.destroy()
        themeDoc = createThemeDoc({ documentId: themeId })
      } else {
        themeDoc?.destroy()
        themeDoc = null
      }
    }
  })

  // Compute resolved theme
  const resolvedTheme: ResolvedTheme = $derived(
    doc?.synced ?
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

  // Parse content into segments
  const segments: ContentSegment[] = $derived(
    doc?.synced ? parseContentSegments(doc.content, doc.contentVersion) : [],
  )

  // Follow mode state
  let followMode = $state(true)
  let activePresenter = $state<PersistentPresenterState | null>(null)
  let currentSegmentId = $state<string | null>(null)

  // Subscribe to presenter changes
  $effect(() => {
    if (presenterAwareness?.synced) {
      const unsubscribe = presenterAwareness.onPresenterChange((presenter) => {
        activePresenter = presenter
        if (followMode && presenter?.segmentId) {
          currentSegmentId = presenter.segmentId
        }
      })
      return unsubscribe
    }
  })

  // Default to persisted position or first segment
  $effect(() => {
    if (doc?.synced && presenterAwareness?.synced && segments.length > 0 && currentSegmentId === null) {
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

  const hasActiveState = $derived(currentSegmentId !== null)

  onDestroy(() => {
    themeDoc?.destroy()
    presenterAwareness?.destroy()
    doc?.destroy()
  })
</script>

<svelte:head>
  <title>{doc?.synced ? doc.title || 'Channel' : 'Loading...'} - Channel</title>
</svelte:head>

<div class="h-screen">
  {#if loading}
    <div class="flex h-full items-center justify-center">
      <span class="loading loading-lg loading-spinner"></span>
    </div>
  {:else if errorMessage}
    <div class="flex h-full items-center justify-center">
      <div class="text-center">
        <p class="mb-2 text-lg text-error">{errorMessage}</p>
        <a href="/" class="link link-primary">Go home</a>
      </div>
    </div>
  {:else if doc?.synced}
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
