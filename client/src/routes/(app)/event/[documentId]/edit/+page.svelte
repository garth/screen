<script lang="ts">
  import { onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import { toast } from '$lib/toast.svelte'
  import { auth } from '$lib/stores/auth.svelte'
  import { createEventDoc } from '$lib/stores/documents'
  import type { EventChannel } from '$lib/stores/documents/types'

  const documentId = page.params.documentId!

  const doc = createEventDoc({ documentId })

  // Local title state
  let titleInput = $state('')

  $effect(() => {
    if (doc.synced) {
      const meta = doc.meta.toJSON()
      titleInput = (meta.title as string) || ''
    }
  })

  // Debounced title update
  let titleTimeout: ReturnType<typeof setTimeout> | undefined
  function handleTitleChange() {
    if (titleTimeout) clearTimeout(titleTimeout)
    titleTimeout = setTimeout(() => {
      if (doc.synced && !doc.readOnly) {
        doc.meta.set('title', titleInput)
      }
    }, 300)
  }

  // Presentations management
  let newPresentationId = $state('')

  function addPresentation() {
    if (!newPresentationId.trim()) return
    doc.addPresentation(newPresentationId.trim())
    newPresentationId = ''
  }

  // Channel management
  let newChannelName = $state('')

  function addChannel() {
    if (!newChannelName.trim()) return
    doc.addChannel(newChannelName.trim())
    newChannelName = ''
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
      toast('success', 'Event deleted')
      await goto(resolve('/events'))
    } catch {
      toast('error', 'Failed to delete event')
      deleting = false
    }
  }

  // Themes from auth store
  const themes = $derived(auth.themes.map((t) => ({ id: t.id, name: t.name })))

  onDestroy(() => {
    if (titleTimeout) clearTimeout(titleTimeout)
    doc.destroy()
  })
</script>

<svelte:head>
  <title>Edit: {doc.synced ? titleInput || 'Untitled' : 'Loading...'} - Event</title>
</svelte:head>

<div class="flex h-screen flex-col">
  <!-- Header -->
  <header class="navbar min-h-0 border-b border-base-300 bg-base-200 px-4 py-2">
    <div class="flex flex-1 items-center gap-2">
      <a href={resolve('/events')} class="btn btn-ghost btn-sm">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Events
      </a>
      <input
        type="text"
        bind:value={titleInput}
        oninput={handleTitleChange}
        placeholder="Untitled Event"
        class="input w-auto input-ghost text-lg font-medium"
        disabled={!doc.synced || doc.readOnly} />
    </div>

    <div class="flex flex-none items-center gap-4">
      <button
        type="button"
        onclick={() => (showDeleteDialog = true)}
        disabled={deleting}
        class="btn btn-outline btn-sm btn-error">
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  </header>

  <!-- Content -->
  <main class="flex-1 overflow-y-auto">
    {#if !doc.synced}
      <div class="flex h-full items-center justify-center">
        <span class="loading loading-lg loading-spinner"></span>
      </div>
    {:else}
      <div class="mx-auto max-w-4xl space-y-8 p-6">
        <!-- Presentations Section -->
        <section>
          <h2 class="mb-4 text-xl font-semibold">Presentations</h2>
          <div class="space-y-2">
            {#each doc.presentations as presentationId, index (presentationId)}
              <div class="flex items-center gap-2 rounded-lg bg-base-200 p-3">
                <span class="text-sm text-base-content/50">{index + 1}.</span>
                <span class="flex-1 font-mono text-sm">{presentationId}</span>
                {#if !doc.readOnly}
                  <button
                    type="button"
                    onclick={() => doc.removePresentation(presentationId)}
                    class="btn btn-ghost btn-xs btn-error"
                    aria-label="Remove presentation">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
          {#if !doc.readOnly}
            <div class="mt-3 flex gap-2">
              <input
                type="text"
                bind:value={newPresentationId}
                placeholder="Presentation ID"
                class="input input-sm input-bordered flex-1" />
              <button type="button" onclick={addPresentation} class="btn btn-sm btn-primary">
                Add Presentation
              </button>
            </div>
          {/if}
        </section>

        <!-- Channels Section -->
        <section>
          <h2 class="mb-4 text-xl font-semibold">Channels</h2>
          <div class="space-y-4">
            {#each doc.channels as channel (channel.id)}
              <div class="rounded-lg border border-base-300 bg-base-200 p-4">
                <div class="flex items-center justify-between">
                  <h3 class="font-medium">{channel.name}</h3>
                  {#if !doc.readOnly}
                    <button
                      type="button"
                      onclick={() => doc.removeChannel(channel.id)}
                      class="btn btn-ghost btn-xs btn-error"
                      aria-label="Remove channel">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  {/if}
                </div>

                <!-- Channel presentations -->
                <div class="mt-3 space-y-2">
                  {#each channel.presentations as cp (cp.presentationId)}
                    <div class="flex items-center gap-2 rounded bg-base-300 p-2 text-sm">
                      <span class="flex-1 font-mono">{cp.presentationId}</span>
                      {#if !doc.readOnly}
                        <select
                          class="select select-xs select-bordered"
                          value={cp.themeOverrideId || ''}
                          onchange={(e) =>
                            doc.setChannelPresentationTheme(
                              channel.id,
                              cp.presentationId,
                              (e.target as HTMLSelectElement).value || undefined,
                            )}>
                          <option value="">Default theme</option>
                          {#each themes as theme (theme.id)}
                            <option value={theme.id}>{theme.name}</option>
                          {/each}
                        </select>
                        <button
                          type="button"
                          onclick={() => doc.removePresentationFromChannel(channel.id, cp.presentationId)}
                          class="btn btn-ghost btn-xs"
                          aria-label="Remove from channel">
                          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      {/if}
                    </div>
                  {/each}

                  {#if !doc.readOnly && doc.presentations.length > 0}
                    <div class="flex gap-2">
                      <select
                        class="select select-xs select-bordered flex-1"
                        onchange={(e) => {
                          const val = (e.target as HTMLSelectElement).value
                          if (val) {
                            doc.assignPresentationToChannel(channel.id, val)
                            ;(e.target as HTMLSelectElement).value = ''
                          }
                        }}>
                        <option value="">Assign presentation...</option>
                        {#each doc.presentations.filter((pid) => !channel.presentations.some((cp) => cp.presentationId === pid)) as pid (pid)}
                          <option value={pid}>{pid}</option>
                        {/each}
                      </select>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          {#if !doc.readOnly}
            <div class="mt-3 flex gap-2">
              <input
                type="text"
                bind:value={newChannelName}
                placeholder="Channel name"
                class="input input-sm input-bordered flex-1" />
              <button type="button" onclick={addChannel} class="btn btn-sm btn-primary">
                Add Channel
              </button>
            </div>
          {/if}
        </section>
      </div>
    {/if}
  </main>
</div>

<!-- Delete Confirmation Dialog -->
{#if showDeleteDialog}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="modal-open modal" role="dialog" aria-modal="true" aria-labelledby="delete-event-title" onkeydown={(e) => { if (e.key === 'Escape') showDeleteDialog = false }}>
    <div class="modal-box">
      <h3 id="delete-event-title" class="text-lg font-bold">Delete Event</h3>
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
