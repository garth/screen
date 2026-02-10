<script lang="ts">
  import { onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import { toast } from '$lib/toast.svelte'
  import { auth } from '$lib/stores/auth.svelte'
  import { createPresentationDoc, createThemeDoc, type ThemeDocument } from '$lib/stores/documents'
  import type { PresentationFormat } from '$lib/stores/documents/types'
  import PresentationEditor from '$lib/components/presentation/PresentationEditor.svelte'
  import OptionsPopup from '$lib/components/presentation/OptionsPopup.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'

  const documentId = page.params.documentId!

  // Create presentation document store with user info for collaborative cursors
  const doc = createPresentationDoc({
    documentId,
    user: auth.user ? { id: auth.user.id, name: `${auth.user.firstName} ${auth.user.lastName}` } : undefined,
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

  // Options popup
  let showOptionsPopup = $state(false)

  function handleThemeChange(themeId: string | null) {
    if (doc.synced && !doc.readOnly) {
      doc.setThemeId(themeId)
    }
  }

  function handleFormatChange(format: PresentationFormat) {
    if (doc.synced && !doc.readOnly) {
      doc.setFormat(format)
    }
  }

  // Delete handling
  let deleting = $state(false)
  let showDeleteDialog = $state(false)

  async function confirmDelete() {
    if (!auth.userChannel) return
    deleting = true
    showDeleteDialog = false
    try {
      await auth.userChannel.deleteDocument(documentId)
      toast('success', 'Presentation deleted')
      await goto(resolve('/presentations'))
    } catch {
      toast('error', 'Failed to delete presentation')
      deleting = false
    }
  }

  // Themes from auth store (live updates via user channel)
  const themes = $derived(auth.themes.map((t) => ({ id: t.id, name: t.name, isSystemTheme: t.isSystemTheme })))

  onDestroy(() => {
    if (titleTimeout) clearTimeout(titleTimeout)
    themeDoc?.destroy()
    doc.destroy()
  })
</script>

<svelte:head>
  <title>Edit: {doc.synced ? doc.title || 'Untitled' : 'Loading...'} - Presentation</title>
</svelte:head>

<div class="flex h-screen flex-col">
  <!-- Header -->
  <header class="navbar min-h-0 border-b border-base-300 bg-base-200 px-4 py-2">
    <div class="flex flex-1 items-center gap-2">
      <input
        type="text"
        bind:value={titleInput}
        oninput={handleTitleChange}
        placeholder="Untitled"
        class="input w-auto input-ghost text-lg font-medium"
        disabled={!doc.synced || doc.readOnly} />
      {#if !doc.synced}
        <span class="text-xs text-base-content/50">Connecting...</span>
      {/if}
    </div>

    <div class="flex flex-none items-center gap-4">
      <button
        type="button"
        onclick={() => (showOptionsPopup = true)}
        disabled={!doc.synced}
        class="btn btn-ghost btn-sm">
        Options
      </button>

      <a href={resolve(`/presentation/${documentId}/presenter`)} class="btn btn-sm btn-primary">Present</a>

      <button
        type="button"
        onclick={() => (showDeleteDialog = true)}
        disabled={deleting}
        class="btn btn-outline btn-sm btn-error">
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  </header>

  <!-- Editor -->
  <main class="flex flex-1 flex-col overflow-hidden">
    {#if doc.synced}
      <PresentationEditor {doc} theme={resolvedTheme} />
    {:else}
      <div class="flex h-full items-center justify-center">
        <span class="loading loading-lg loading-spinner"></span>
      </div>
    {/if}
  </main>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteDialog}
  <div class="modal-open modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">Delete Presentation</h3>
      <p class="py-4 text-base-content/70">
        Are you sure you want to delete "{titleInput || 'Untitled'}"? This action cannot be undone.
      </p>
      <div class="modal-action">
        <button type="button" onclick={() => (showDeleteDialog = false)} class="btn btn-ghost">Cancel</button>
        <button type="button" onclick={confirmDelete} class="btn btn-error">Delete</button>
      </div>
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={() => (showDeleteDialog = false)}></div>
  </div>
{/if}

<!-- Options Popup -->
{#if showOptionsPopup}
  <OptionsPopup
    open={showOptionsPopup}
    {themes}
    currentThemeId={doc.themeId}
    currentFormat={doc.format}
    disabled={!doc.synced || doc.readOnly}
    onThemeChange={handleThemeChange}
    onFormatChange={handleFormatChange}
    onClose={() => (showOptionsPopup = false)} />
{/if}
