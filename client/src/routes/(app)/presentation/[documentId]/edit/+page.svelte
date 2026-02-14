<script lang="ts">
  import { onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import { toast } from '$lib/toast.svelte'
  import { auth } from '$lib/stores/auth.svelte'
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte'
  import { createPresentationDoc } from '$lib/stores/documents'
  import type { PresentationFormat } from '$lib/stores/documents/types'
  import PresentationEditor from '$lib/components/presentation/PresentationEditor.svelte'
  import OptionsPopup from '$lib/components/presentation/OptionsPopup.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'
  import { createThemeLoader } from '$lib/utils/theme-loader.svelte'

  const documentId = page.params.documentId!

  // Create presentation document store with user info for collaborative cursors
  const doc = createPresentationDoc({
    documentId,
    user: auth.user ? { id: auth.user.id, name: `${auth.user.firstName} ${auth.user.lastName}` } : undefined,
  })

  // Theme document (loaded when themeId is available)
  const themeLoader = createThemeLoader({
    getSynced: () => doc.synced,
    getThemeId: () => doc.themeId,
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
        themeLoader.current?.synced ? themeLoader.current : null,
      )
    : defaultTheme,
  )

  // Local title state for input
  let titleInput = $state('')
  let initialTitleSet = false

  // Sync title from doc when it syncs
  $effect(() => {
    if (doc.synced) {
      // For new documents, the Yjs title is empty but the DB name has the generated name
      if (!initialTitleSet && !doc.title && !doc.readOnly) {
        const docInfo = auth.documents.find((d) => d.id === documentId)
        if (docInfo?.title && docInfo.title !== 'Untitled') {
          doc.setTitle(docInfo.title)
          titleInput = docInfo.title
          initialTitleSet = true
          return
        }
      }
      initialTitleSet = true
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

  // Sharing state — derived from document list
  const isPublic = $derived(auth.documents.find((d) => d.id === documentId)?.isPublic ?? false)
  let sharingLoading = $state(false)

  async function toggleSharing() {
    if (!auth.userChannel) return
    sharingLoading = true
    try {
      await auth.userChannel.updateDocument({ id: documentId, isPublic: !isPublic })
    } catch {
      toast('error', 'Failed to update sharing')
    }
    sharingLoading = false
  }

  // Themes from auth store (live updates via user channel)
  const themes = $derived(auth.themes.map((t) => ({ id: t.id, name: t.name, isSystemTheme: t.isSystemTheme })))

  onDestroy(() => {
    if (titleTimeout) clearTimeout(titleTimeout)
    themeLoader.destroy()
    doc.destroy()
  })
</script>

<svelte:head>
  <title>Edit: {doc.synced ? doc.title || 'Untitled' : 'Loading...'} - Presentation</title>
</svelte:head>

<div class="flex h-full flex-col">
  <h1 class="sr-only">Edit Presentation</h1>
  <!-- Header -->
  <header class="navbar min-h-0 border-b border-base-300 bg-base-200 px-4 py-1">
    <div class="flex flex-1 items-center gap-2">
      <input
        type="text"
        bind:value={titleInput}
        oninput={handleTitleChange}
        placeholder="Untitled"
        class="input input-sm w-auto input-ghost text-sm font-medium"
        disabled={!doc.synced || doc.readOnly} />
      {#if !doc.synced}
        <span class="text-xs text-base-content/50">Connecting...</span>
      {/if}
    </div>

    <div class="flex flex-none items-center gap-2 sm:gap-4">
      <button
        type="button"
        onclick={() => (showOptionsPopup = true)}
        disabled={!doc.synced}
        class="btn btn-ghost btn-sm">
        <span class="hero-adjustments-horizontal-mini size-5" aria-hidden="true"></span>
        <span class="hidden sm:inline">Options</span>
      </button>

      <a href={resolve(`/presentation/${documentId}/presenter`)} class="btn btn-sm btn-primary">
        <span class="hero-presentation-chart-bar-mini size-5" aria-hidden="true"></span>
        <span class="hidden sm:inline">Present</span>
      </a>

      <button
        type="button"
        onclick={() => (showDeleteDialog = true)}
        disabled={deleting}
        class="btn btn-ghost btn-sm text-error"
        aria-label="Delete presentation">
        <span class="hero-trash-mini size-5" aria-hidden="true"></span>
      </button>
    </div>
  </header>

  <!-- Editor -->
  <main class="flex min-h-0 flex-1 flex-col">
    {#if doc.error}
      <div class="flex h-full flex-col items-center justify-center gap-4">
        <h2 class="text-2xl font-bold">Presentation not found</h2>
        <p class="text-base-content/70">This presentation doesn't exist or you don't have access to it.</p>
        <a href={resolve('/presentations')} class="btn btn-sm btn-primary">Back to presentations</a>
      </div>
    {:else if doc.synced}
      <PresentationEditor {doc} theme={resolvedTheme} />
    {:else if doc.syncTimedOut}
      <div class="flex h-full flex-col items-center justify-center gap-4">
        <p class="text-base-content/70">Failed to connect to the document.</p>
        <button type="button" onclick={() => doc.retry()} class="btn btn-sm btn-primary">Retry</button>
      </div>
    {:else}
      <div class="flex h-full items-center justify-center">
        <span class="loading loading-lg loading-spinner" role="status" aria-label="Loading"></span>
      </div>
    {/if}
  </main>
</div>

{#if showDeleteDialog}
  <ConfirmDialog
    title="Delete Presentation"
    message={'Are you sure you want to delete "' + (titleInput || 'Untitled') + '"? This action cannot be undone.'}
    onConfirm={confirmDelete}
    onCancel={() => (showDeleteDialog = false)} />
{/if}

<!-- Options Popup -->
{#if showOptionsPopup}
  <OptionsPopup
    open={showOptionsPopup}
    {themes}
    currentThemeId={doc.themeId}
    currentFormat={doc.format}
    {isPublic}
    {sharingLoading}
    disabled={!doc.synced || doc.readOnly}
    onThemeChange={handleThemeChange}
    onFormatChange={handleFormatChange}
    onToggleSharing={toggleSharing}
    onClose={() => (showOptionsPopup = false)} />
{/if}
