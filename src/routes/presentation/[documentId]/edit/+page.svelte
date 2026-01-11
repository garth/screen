<script lang="ts">
  import { onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { toast } from '$lib/toast.svelte'
  import { createPresentationDoc, createThemeDoc, type ThemeDocument } from '$lib/stores/documents'
  import PresentationEditor from '$lib/components/presentation/PresentationEditor.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'

  let { data } = $props()

  // Create presentation document store with user info for collaborative cursors
  const doc = createPresentationDoc({
    documentId: data.document.id,
    baseDocumentId: data.document.baseDocumentId ?? undefined,
    user: data.user,
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

  // Local title state for input
  let titleInput = $state('')

  // Sync title from doc when it syncs
  // If Yjs doc has no title but database has one, initialize it from database
  $effect(() => {
    if (doc.synced) {
      if (!doc.title && data.document.title && !doc.readOnly) {
        doc.setTitle(data.document.title)
        titleInput = data.document.title
      } else {
        titleInput = doc.title || ''
      }
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

  // Delete handling
  let deleting = $state(false)
  let deleteDialog = $state<HTMLDialogElement | null>(null)

  function showDeleteDialog() {
    deleteDialog?.showModal()
  }

  function closeDeleteDialog() {
    deleteDialog?.close()
  }

  async function confirmDelete() {
    deleting = true
    closeDeleteDialog()
    try {
      const response = await fetch(`/api/presentations?id=${data.document.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete')
      }
      toast('success', 'Presentation deleted')
      await goto(resolve('/presentations'))
    } catch {
      toast('error', 'Failed to delete presentation')
      deleting = false
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
      <div class="flex items-center gap-2">
        <input
          type="text"
          bind:value={titleInput}
          oninput={handleTitleChange}
          placeholder="Untitled"
          class="rounded bg-transparent px-2 py-1 text-lg font-medium text-gray-100 placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500"
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
        href={resolve(`/presentation/${data.document.id}/presenter`)}
        class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
        Present
      </a>

      <button
        type="button"
        onclick={showDeleteDialog}
        disabled={deleting}
        class="rounded border border-red-600 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/50 disabled:opacity-50">
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
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

<!-- Delete Confirmation Dialog -->
<dialog
  bind:this={deleteDialog}
  class="delete-dialog fixed inset-0 m-auto rounded-lg border border-gray-700 bg-gray-800 p-0 text-gray-100 shadow-xl backdrop:bg-black/50">
  <div class="p-6">
    <h2 class="mb-2 text-lg font-semibold">Delete Presentation</h2>
    <p class="mb-6 text-gray-400">
      Are you sure you want to delete "{titleInput || 'Untitled'}"? This action cannot be undone.
    </p>
    <div class="flex justify-end gap-3">
      <button
        type="button"
        onclick={closeDeleteDialog}
        class="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
        Cancel
      </button>
      <button
        type="button"
        onclick={confirmDelete}
        class="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500">
        Delete
      </button>
    </div>
  </div>
</dialog>

<style>
  .delete-dialog {
    opacity: 0;
    transform: scale(0.95);
    transition:
      opacity 150ms ease-out,
      transform 150ms ease-out,
      overlay 150ms ease-out allow-discrete,
      display 150ms ease-out allow-discrete;
  }

  .delete-dialog[open] {
    opacity: 1;
    transform: scale(1);
  }

  .delete-dialog::backdrop {
    opacity: 0;
    transition:
      opacity 150ms ease-out,
      overlay 150ms ease-out allow-discrete,
      display 150ms ease-out allow-discrete;
  }

  .delete-dialog[open]::backdrop {
    opacity: 1;
  }

  @starting-style {
    .delete-dialog[open] {
      opacity: 0;
      transform: scale(0.95);
    }

    .delete-dialog[open]::backdrop {
      opacity: 0;
    }
  }
</style>
