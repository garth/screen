<script lang="ts">
  import { onDestroy } from 'svelte'
  import { createPresentationDoc } from '$lib/stores/documents/presentation.svelte'
  import { createThemeDoc } from '$lib/stores/documents/theme.svelte'
  import { createEventDoc } from '$lib/stores/documents/event.svelte'
  import type { PresentationDocument, ThemeDocument, EventDocument } from '$lib/stores/documents/types'
  import type { PageData } from './$types'

  // Get test env flag from server (constant, won't change during page lifecycle)
  const { data }: { data: PageData } = $props()
  // eslint-disable-next-line svelte/state-referenced-locally
  const isTestEnv = data.isTestEnv

  let documentType = $state<'presentation' | 'theme' | 'event'>('presentation')
  let documentId = $state('')
  let baseDocumentId = $state('')
  let activeDoc = $state<PresentationDocument | ThemeDocument | EventDocument | null>(null)
  let status = $state<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  let errorMessage = $state('')

  function connect() {
    if (!documentId || !isTestEnv) return

    status = 'connecting'
    errorMessage = ''

    try {
      const options = {
        documentId,
        baseDocumentId: baseDocumentId || undefined,
      }

      if (documentType === 'presentation') {
        activeDoc = createPresentationDoc(options)
      } else if (documentType === 'theme') {
        activeDoc = createThemeDoc(options)
      } else if (documentType === 'event') {
        activeDoc = createEventDoc(options)
      }
    } catch (e) {
      status = 'error'
      errorMessage = e instanceof Error ? e.message : 'Unknown error'
    }
  }

  function disconnect() {
    activeDoc?.destroy()
    activeDoc = null
    status = 'idle'
  }

  // Expose methods for e2e testing via window
  $effect(() => {
    if (typeof window !== 'undefined' && isTestEnv) {
      // @ts-expect-error - exposing for e2e tests
      window.__testDocumentAPI = {
        connect: (type: 'presentation' | 'theme' | 'event', docId: string, baseDocId?: string) => {
          documentType = type
          documentId = docId
          baseDocumentId = baseDocId || ''
          connect()
        },
        disconnect,
        getStatus: () => ({
          status,
          connected: activeDoc?.connected ?? false,
          synced: activeDoc?.synced ?? false,
          readOnly: activeDoc?.readOnly ?? true,
        }),
        // Presentation methods
        getTitle: () => (activeDoc as PresentationDocument)?.title ?? '',
        setTitle: (title: string) => (activeDoc as PresentationDocument)?.setTitle(title),
        getThemeId: () => (activeDoc as PresentationDocument)?.themeId ?? null,
        setThemeId: (id: string | null) => (activeDoc as PresentationDocument)?.setThemeId(id),
        getContent: () => (activeDoc as PresentationDocument)?.content?.toString() ?? '',
        insertContent: (text: string, pos?: number) => {
          const content = (activeDoc as PresentationDocument)?.content
          content?.insert(pos ?? 0, text)
        },
        // Theme methods
        getFont: () => (activeDoc as ThemeDocument)?.font ?? '',
        setFont: (font: string) => (activeDoc as ThemeDocument)?.setFont(font),
        getBackgroundColor: () => (activeDoc as ThemeDocument)?.backgroundColor ?? '',
        setBackgroundColor: (color: string) => (activeDoc as ThemeDocument)?.setBackgroundColor(color),
        getTextColor: () => (activeDoc as ThemeDocument)?.textColor ?? '',
        setTextColor: (color: string) => (activeDoc as ThemeDocument)?.setTextColor(color),
        getEffectiveFont: () => (activeDoc as ThemeDocument)?.effectiveFont ?? '',
        getEffectiveBackgroundColor: () => (activeDoc as ThemeDocument)?.effectiveBackgroundColor ?? '',
        getEffectiveTextColor: () => (activeDoc as ThemeDocument)?.effectiveTextColor ?? '',
        getViewport: () => (activeDoc as ThemeDocument)?.viewport ?? null,
        setViewport: (viewport: { x: number; y: number; width: number; height: number } | undefined) =>
          (activeDoc as ThemeDocument)?.setViewport(viewport),
        // Event methods
        getPresentations: () => (activeDoc as EventDocument)?.presentations ?? [],
        addPresentation: (id: string) => (activeDoc as EventDocument)?.addPresentation(id),
        removePresentation: (id: string) => (activeDoc as EventDocument)?.removePresentation(id),
        reorderPresentation: (id: string, newIndex: number) =>
          (activeDoc as EventDocument)?.reorderPresentation(id, newIndex),
        getChannels: () => (activeDoc as EventDocument)?.channels ?? [],
        addChannel: (name: string) => (activeDoc as EventDocument)?.addChannel(name),
        removeChannel: (id: string) => (activeDoc as EventDocument)?.removeChannel(id),
        updateChannel: (id: string, updates: { name?: string; order?: number }) =>
          (activeDoc as EventDocument)?.updateChannel(id, updates),
        assignPresentationToChannel: (channelId: string, presentationId: string, themeOverrideId?: string) =>
          (activeDoc as EventDocument)?.assignPresentationToChannel(channelId, presentationId, themeOverrideId),
        removePresentationFromChannel: (channelId: string, presentationId: string) =>
          (activeDoc as EventDocument)?.removePresentationFromChannel(channelId, presentationId),
      }
    }
  })

  // Update status when doc syncs
  $effect(() => {
    if (activeDoc?.synced) {
      status = 'connected'
    }
  })

  onDestroy(() => {
    disconnect()
  })
</script>

{#if !isTestEnv}
  <p>This page is only available in test environments.</p>
{:else}
  <div data-testid="document-test-page">
    <h1>Document API Test Page</h1>

    <div>
      <label>
        Document Type:
        <select bind:value={documentType} data-testid="document-type">
          <option value="presentation">Presentation</option>
          <option value="theme">Theme</option>
          <option value="event">Event</option>
        </select>
      </label>
    </div>

    <div>
      <label>
        Document ID:
        <input type="text" bind:value={documentId} data-testid="document-id" />
      </label>
    </div>

    <div>
      <label>
        Base Document ID (optional):
        <input type="text" bind:value={baseDocumentId} data-testid="base-document-id" />
      </label>
    </div>

    <div>
      <button onclick={connect} disabled={!documentId || status === 'connecting'} data-testid="connect-btn">
        Connect
      </button>
      <button onclick={disconnect} disabled={status === 'idle'} data-testid="disconnect-btn">
        Disconnect
      </button>
    </div>

    <div data-testid="status">
      Status: {status}
      {#if activeDoc}
        | Connected: {activeDoc.connected}
        | Synced: {activeDoc.synced}
        | ReadOnly: {activeDoc.readOnly}
      {/if}
    </div>

    {#if errorMessage}
      <div data-testid="error">{errorMessage}</div>
    {/if}

    {#if activeDoc?.synced}
      <div data-testid="doc-info">
        {#if documentType === 'presentation'}
          <div>Title: <span data-testid="title">{(activeDoc as PresentationDocument).title}</span></div>
          <div>Theme ID: <span data-testid="theme-id">{(activeDoc as PresentationDocument).themeId ?? 'none'}</span></div>
        {:else if documentType === 'theme'}
          <div>Font: <span data-testid="font">{(activeDoc as ThemeDocument).font}</span></div>
          <div>Background: <span data-testid="bg-color">{(activeDoc as ThemeDocument).backgroundColor}</span></div>
          <div>Text Color: <span data-testid="text-color">{(activeDoc as ThemeDocument).textColor}</span></div>
          <div>Effective Font: <span data-testid="effective-font">{(activeDoc as ThemeDocument).effectiveFont}</span></div>
        {:else if documentType === 'event'}
          <div>Presentations: <span data-testid="presentations">{JSON.stringify((activeDoc as EventDocument).presentations)}</span></div>
          <div>Channels: <span data-testid="channels">{JSON.stringify((activeDoc as EventDocument).channels)}</span></div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
