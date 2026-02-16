<script lang="ts">
  import { onDestroy } from 'svelte'
  import { browser } from '$app/environment'
  import {
    createPresentationDoc,
    createThemeDoc,
    createEventDoc,
    type PresentationDocument,
    type ThemeDocument,
    type EventDocument,
  } from '$lib/stores/documents'
  import * as Y from 'yjs'

  let currentDoc = $state<PresentationDocument | ThemeDocument | EventDocument | null>(null)
  let docType = $state<string>('idle')
  let status = $state('idle')

  function connect(type: string, documentId: string, baseDocumentId?: string) {
    disconnect()

    if (type === 'presentation') {
      currentDoc = createPresentationDoc({ documentId })
      docType = 'presentation'
    } else if (type === 'theme') {
      currentDoc = createThemeDoc({ documentId, baseDocumentId })
      docType = 'theme'
    } else if (type === 'event') {
      currentDoc = createEventDoc({ documentId })
      docType = 'event'
    }
    status = 'connecting'
  }

  function disconnect() {
    if (currentDoc) {
      currentDoc.destroy()
      currentDoc = null
      docType = 'idle'
      status = 'idle'
    }
  }

  function getStatus() {
    if (!currentDoc) return { status: 'idle', connected: false, synced: false }
    return {
      status:
        currentDoc.connected ?
          currentDoc.synced ?
            'synced'
          : 'connected'
        : 'connecting',
      connected: currentDoc.connected,
      synced: currentDoc.synced,
    }
  }

  // Presentation methods
  // Write directly to Yjs meta to bypass readOnly assertion (for testing server-side enforcement)
  function setTitle(value: string) {
    if (currentDoc && (docType === 'presentation' || docType === 'event')) {
      currentDoc.meta.set('title', value)
    }
  }

  function getTitle(): string {
    if (currentDoc && docType === 'presentation') return (currentDoc as PresentationDocument).title
    if (currentDoc && docType === 'event') return (currentDoc as EventDocument).title
    return ''
  }

  function setThemeId(value: string | null) {
    if (currentDoc && docType === 'presentation') currentDoc.meta.set('themeId', value)
  }

  function getThemeId(): string | null {
    if (currentDoc && docType === 'presentation') return (currentDoc as PresentationDocument).themeId
    return null
  }

  function insertContent(text: string) {
    if (currentDoc && docType === 'presentation') {
      const doc = currentDoc as PresentationDocument
      const fragment = doc.content
      const ytext = new Y.XmlText(text)
      const element = new Y.XmlElement('paragraph')
      element.insert(0, [ytext])
      fragment.insert(fragment.length, [element])
    }
  }

  function getContent(): string {
    if (currentDoc && docType === 'presentation') {
      const doc = currentDoc as PresentationDocument
      return doc.content.toDOM().textContent || ''
    }
    return ''
  }

  // Theme methods (write directly to meta to bypass readOnly for testing)
  function setFont(value: string) {
    if (currentDoc && docType === 'theme') currentDoc.meta.set('font', value)
  }

  function getFont(): string {
    if (currentDoc && docType === 'theme') return (currentDoc as ThemeDocument).font
    return ''
  }

  function setBackgroundColor(value: string) {
    if (currentDoc && docType === 'theme') currentDoc.meta.set('backgroundColor', value)
  }

  function getBackgroundColor(): string {
    if (currentDoc && docType === 'theme') return (currentDoc as ThemeDocument).backgroundColor
    return ''
  }

  function setTextColor(value: string) {
    if (currentDoc && docType === 'theme') currentDoc.meta.set('textColor', value)
  }

  function getTextColor(): string {
    if (currentDoc && docType === 'theme') return (currentDoc as ThemeDocument).textColor
    return ''
  }

  function setViewport(value: { x: number; y: number; width: number; height: number } | undefined) {
    if (currentDoc && docType === 'theme') currentDoc.meta.set('viewport', value ?? null)
  }

  function getViewport() {
    if (currentDoc && docType === 'theme') return (currentDoc as ThemeDocument).viewport ?? null
    return null
  }

  function getEffectiveFont(): string {
    if (currentDoc && docType === 'theme') return (currentDoc as ThemeDocument).effectiveFont
    return ''
  }

  function getEffectiveBackgroundColor(): string {
    if (currentDoc && docType === 'theme') return (currentDoc as ThemeDocument).effectiveBackgroundColor
    return ''
  }

  function getEffectiveTextColor(): string {
    if (currentDoc && docType === 'theme') return (currentDoc as ThemeDocument).effectiveTextColor
    return ''
  }

  // Event methods
  function addPresentation(id: string) {
    if (currentDoc && docType === 'event') (currentDoc as EventDocument).addPresentation(id)
  }

  function getPresentations(): string[] {
    if (currentDoc && docType === 'event') return (currentDoc as EventDocument).presentations
    return []
  }

  function removePresentation(id: string) {
    if (currentDoc && docType === 'event') (currentDoc as EventDocument).removePresentation(id)
  }

  function reorderPresentation(id: string, newIndex: number) {
    if (currentDoc && docType === 'event') (currentDoc as EventDocument).reorderPresentation(id, newIndex)
  }

  function addChannel(name: string) {
    if (currentDoc && docType === 'event') return (currentDoc as EventDocument).addChannel(name)
    return ''
  }

  function getChannels() {
    if (currentDoc && docType === 'event') return (currentDoc as EventDocument).channels
    return []
  }

  function removeChannel(channelId: string) {
    if (currentDoc && docType === 'event') (currentDoc as EventDocument).removeChannel(channelId)
  }

  function assignPresentationToChannel(channelId: string, presentationId: string, themeOverrideId?: string) {
    if (currentDoc && docType === 'event')
      (currentDoc as EventDocument).assignPresentationToChannel(channelId, presentationId, themeOverrideId)
  }

  function removePresentationFromChannel(channelId: string, presentationId: string) {
    if (currentDoc && docType === 'event')
      (currentDoc as EventDocument).removePresentationFromChannel(channelId, presentationId)
  }

  // Expose API on window for e2e tests
  if (browser) {
    ;(window as unknown as Record<string, unknown>).__testDocumentAPI = {
      connect,
      disconnect,
      getStatus,
      setTitle,
      getTitle,
      setThemeId,
      getThemeId,
      insertContent,
      getContent,
      setFont,
      getFont,
      setBackgroundColor,
      getBackgroundColor,
      setTextColor,
      getTextColor,
      setViewport,
      getViewport,
      getEffectiveFont,
      getEffectiveBackgroundColor,
      getEffectiveTextColor,
      addPresentation,
      getPresentations,
      removePresentation,
      reorderPresentation,
      addChannel,
      getChannels,
      removeChannel,
      assignPresentationToChannel,
      removePresentationFromChannel,
    }
  }

  $effect(() => {
    if (currentDoc) {
      if (currentDoc.synced) status = 'synced'
      else if (currentDoc.connected) status = 'connected'
      else status = 'connecting'
    }
  })

  onDestroy(() => {
    disconnect()
    if (browser) {
      delete (window as unknown as Record<string, unknown>).__testDocumentAPI
    }
  })
</script>

<div data-testid="document-test-page">
  <p data-testid="status">Status: {status}</p>
  <p data-testid="doc-type">Type: {docType}</p>
</div>
