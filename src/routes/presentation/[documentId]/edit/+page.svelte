<script lang="ts">
  import { onDestroy } from 'svelte'
  import { createPresentationDoc, createThemeDoc, type ThemeDocument } from '$lib/stores/documents'
  import PresentationEditor from '$lib/components/presentation/PresentationEditor.svelte'
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

  // Local title state for input
  let titleInput = $state('')

  // Sync title from doc when it syncs
  $effect(() => {
    if (doc.synced) {
      titleInput = doc.title || ''
    }
  })

  // Debounced title update
  let titleTimeout: ReturnType<typeof setTimeout> | undefined
  function handleTitleChange() {
    if (titleTimeout) clearTimeout(titleTimeout)
    titleTimeout = setTimeout(() => {
      if (doc.synced && !doc.readOnly) {
        doc.setTitle(titleInput)
      }
    }, 300)
  }

  // Theme selection
  function handleThemeChange(event: Event) {
    const target = event.target as HTMLSelectElement
    const themeId = target.value || null
    if (doc.synced && !doc.readOnly) {
      doc.setThemeId(themeId)
    }
  }

  onDestroy(() => {
    if (titleTimeout) clearTimeout(titleTimeout)
    themeDoc?.destroy()
    doc.destroy()
  })
</script>

<svelte:head>
  <title>Edit: {data.document.title} - Presentation</title>
</svelte:head>

<div class="flex h-screen flex-col">
  <!-- Header -->
  <header class="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-3">
    <div class="flex items-center gap-4">
      <a href="/presentation/{data.document.id}" class="text-gray-400 hover:text-gray-200">
        &larr; Back
      </a>
      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={titleInput}
          oninput={handleTitleChange}
          placeholder="Untitled"
          class="bg-transparent text-lg font-medium text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
          disabled={!doc.synced || doc.readOnly} />
        {#if !doc.synced}
          <span class="text-xs text-gray-500">Connecting...</span>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-4">
      <!-- Theme Picker -->
      <div class="flex items-center gap-2">
        <label for="theme-select" class="text-sm text-gray-400">Theme:</label>
        <select
          id="theme-select"
          onchange={handleThemeChange}
          disabled={!doc.synced || doc.readOnly}
          class="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-gray-200 outline-none focus:border-blue-500">
          <option value="">No theme</option>
          {#each data.themes as theme (theme.id)}
            <option value={theme.id} selected={doc.themeId === theme.id}>
              {theme.name}
              {#if theme.isSystemTheme}(System){/if}
            </option>
          {/each}
        </select>
      </div>

      <a
        href="/presentation/{data.document.id}/presenter"
        class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
        Present
      </a>
    </div>
  </header>

  <!-- Editor -->
  <main class="flex-1 overflow-hidden">
    {#if doc.synced}
      <PresentationEditor {doc} theme={resolvedTheme} />
    {:else}
      <div class="flex h-full items-center justify-center">
        <p class="text-gray-500">Loading editor...</p>
      </div>
    {/if}
  </main>
</div>
