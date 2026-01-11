<script lang="ts">
  import { onDestroy } from 'svelte'
  import { createPresentationDoc, createThemeDoc, type ThemeDocument } from '$lib/stores/documents'
  import PresentationViewer from '$lib/components/presentation/PresentationViewer.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'

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
    doc.synced
      ? resolveTheme(
          {
            font: doc.font,
            backgroundColor: doc.backgroundColor,
            textColor: doc.textColor,
          },
          themeDoc?.synced ? themeDoc : null,
        )
      : defaultTheme,
  )

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
      <a href="/presentations" class="text-gray-400 hover:text-gray-200">
        &larr; Back
      </a>
      <h1 class="text-lg font-medium text-gray-100">
        {doc.synced && doc.title ? doc.title : data.document.title || 'Untitled'}
      </h1>
    </div>

    {#if data.permissions.canWrite}
      <div class="flex items-center gap-2">
        <a
          href="/presentation/{data.document.id}/edit"
          class="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700">
          Edit
        </a>
        <a
          href="/presentation/{data.document.id}/presenter"
          class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
          Present
        </a>
      </div>
    {/if}
  </header>

  <!-- Viewer -->
  <main class="flex-1 overflow-hidden">
    {#if doc.synced}
      <PresentationViewer content={doc.content} theme={resolvedTheme} mode="view" />
    {:else}
      <div class="flex h-full items-center justify-center">
        <p class="text-gray-500">Loading presentation...</p>
      </div>
    {/if}
  </main>
</div>
