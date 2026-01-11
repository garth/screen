<script lang="ts">
  import { onDestroy } from 'svelte'
  import { resolve } from '$app/paths'
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

<div class="flex h-screen flex-col">
  <!-- Header -->
  <header class="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-3">
    <div class="flex items-center gap-4">
      <h1 class="text-lg font-medium text-gray-100">
        {doc.synced && doc.title ? doc.title : data.document.title || 'Untitled'}
      </h1>
    </div>

    <div class="flex items-center gap-3">
      {#if activePresenter}
        <button
          type="button"
          onclick={() => (followMode = !followMode)}
          class="flex items-center gap-2 rounded px-3 py-1.5 text-sm {followMode ? 'bg-purple-600 text-white' : (
            'border border-gray-600 text-gray-300 hover:bg-gray-700'
          )}">
          {#if followMode}
            <span class="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
            Following presenter
          {:else}
            Follow presenter
          {/if}
        </button>
      {/if}

      {#if data.permissions.canWrite}
        <a
          href={resolve(`/presentation/${data.document.id}/edit`)}
          class="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700">
          Edit
        </a>
        <a
          href={resolve(`/presentation/${data.document.id}/presenter`)}
          class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
          Present
        </a>
      {/if}
    </div>
  </header>

  <!-- Viewer -->
  <main class="flex-1 overflow-hidden">
    {#if doc.synced}
      <PresentationViewer
        content={doc.content}
        theme={resolvedTheme}
        mode={isFollowing ? 'present' : 'view'}
        segments={isFollowing ? segments : []}
        currentSegmentId={isFollowing ? currentSegmentId : null} />
    {:else}
      <div class="flex h-full items-center justify-center">
        <p class="text-gray-500">Loading presentation...</p>
      </div>
    {/if}
  </main>
</div>
