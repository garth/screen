<script lang="ts">
  import { onDestroy } from 'svelte'
  import { page } from '$app/state'
  import {
    createPresentationDoc,
    createEventDoc,
    createPresenterAwarenessDoc,
    type PersistentPresenterState,
    type EventDocument,
  } from '$lib/stores/documents'
  import { getSocket } from '$lib/providers/phoenix-socket'
  import PresentationViewer from '$lib/components/presentation/PresentationViewer.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'
  import { parseContentSegments, type ContentSegment } from '$lib/utils/segment-parser'
  import { createThemeLoader } from '$lib/utils/theme-loader.svelte'
  import type { Channel } from 'phoenix'

  const slug = page.params.slug!

  // Channel data loaded via Phoenix Channel
  let channelData = $state<{
    presentationId: string
    themeOverrideId?: string
  } | null>(null)
  let loading = $state(true)
  let errorMessage = $state<string | null>(null)

  // Track resources for cleanup
  let lookupChannel: Channel | null = null
  let eventDoc = $state<EventDocument | null>(null)

  // Load channel data by joining the channel:slug topic
  $effect(() => {
    const socket = getSocket()
    const channel = socket.channel(`channel:slug:${slug}`, {})
    lookupChannel = channel

    channel
      .join()
      .receive('ok', (reply) => {
        const { name: channelName, eventDocumentId } = reply as {
          id: string
          name: string
          slug: string
          eventDocumentId: string
        }
        // Got channel info — now join the event doc to resolve the presentation
        eventDoc = createEventDoc({ documentId: eventDocumentId })

        // Leave the lookup channel now that we have the data
        channel.leave()
        lookupChannel = null

        // Watch for event doc to sync, then resolve the channel's presentation
        const checkInterval = setInterval(() => {
          if (eventDoc?.synced) {
            clearInterval(checkInterval)
            resolvePresentation(channelName)
          }
        }, 50)

        // Timeout after 15s
        setTimeout(() => {
          clearInterval(checkInterval)
          if (loading) {
            errorMessage = 'Failed to load channel data'
            loading = false
          }
        }, 15_000)
      })
      .receive('error', (resp) => {
        const { reason } = resp as { reason?: string }
        errorMessage = reason === 'not found' ? 'Channel not found' : 'Failed to load channel'
        loading = false
      })
  })

  function resolvePresentation(channelName: string) {
    if (!eventDoc?.synced) return

    // Find the channel in the event doc's Yjs state by name
    // (DB channels and Yjs event channels are linked by name per spec)
    const eventChannel = eventDoc.channels.find((c) => c.name === channelName)

    if (!eventChannel || eventChannel.presentations.length === 0) {
      errorMessage = 'No presentation available for this channel'
      loading = false
      return
    }

    // Use the first presentation assigned to this channel
    const relation = eventChannel.presentations[0]
    channelData = {
      presentationId: relation.presentationId,
      themeOverrideId: relation.themeOverrideId,
    }
    loading = false
  }

  // Presentation document (loaded once channel data is available)
  let doc = $state<ReturnType<typeof createPresentationDoc> | null>(null)
  let presenterAwareness = $state<ReturnType<typeof createPresenterAwarenessDoc> | null>(null)

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
  const themeLoader = createThemeLoader({
    getSynced: () => !!doc?.synced,
    getThemeId: () => channelData?.themeOverrideId || doc?.themeId || null,
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
        themeLoader.current?.synced ? themeLoader.current : null,
      )
    : defaultTheme,
  )

  // Parse content into segments
  const segments: ContentSegment[] = $derived(doc?.synced ? parseContentSegments(doc.content, doc.contentVersion) : [])

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
    lookupChannel?.leave()
    themeLoader.destroy()
    presenterAwareness?.destroy()
    doc?.destroy()
    eventDoc?.destroy()
  })
</script>

<svelte:head>
  <title>{doc?.synced ? doc.title || 'Channel' : 'Loading...'} - Channel</title>
</svelte:head>

<div class="h-screen">
  {#if loading}
    <div class="flex h-full items-center justify-center">
      <span class="loading loading-lg loading-spinner" role="status" aria-label="Loading"></span>
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
      <span class="loading loading-lg loading-spinner" role="status" aria-label="Loading"></span>
    </div>
  {/if}
</div>
