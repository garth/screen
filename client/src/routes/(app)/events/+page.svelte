<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { browser } from '$app/environment'
  import { toast } from '$lib/toast.svelte'
  import { auth } from '$lib/stores/auth.svelte'
  import { createDocumentListDoc } from '$lib/stores/documents/document-list.svelte'
  import type { DocumentListDocument, DocumentListItem } from '$lib/stores/documents/document-list.svelte'

  let creating = $state(false)
  let docList = $state<DocumentListDocument | null>(null)

  onMount(() => {
    if (browser && auth.userId) {
      docList = createDocumentListDoc({ userId: auth.userId })
    }
  })

  onDestroy(() => {
    docList?.destroy()
  })

  async function createEvent() {
    if (!auth.userChannel) return
    creating = true
    try {
      const id = await auth.userChannel.createDocument('event')
      await goto(resolve(`/event/${id}/edit`))
    } catch {
      toast('error', 'Failed to create event')
      creating = false
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const events: DocumentListItem[] = $derived(docList?.events ?? [])
  const synced = $derived(docList?.synced ?? false)
  const connected = $derived(docList?.connected ?? false)
</script>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold">Events</h1>
      {#if !synced}
        <span class="text-sm text-base-content/50">Loading...</span>
      {:else if !connected}
        <span class="badge gap-1 badge-warning">
          <span class="inline-block h-2 w-2 rounded-full bg-warning"></span>
          Offline
        </span>
      {/if}
    </div>
    <button type="button" onclick={createEvent} disabled={creating} class="btn btn-primary">
      {#if creating}
        <span class="loading loading-sm loading-spinner"></span>
        Creating...
      {:else}
        New Event
      {/if}
    </button>
  </div>

  {#if !synced}
    <div class="card bg-base-200">
      <div class="card-body items-center py-12 text-center">
        <span class="loading loading-lg loading-spinner"></span>
        <p class="text-base-content/70">Loading events...</p>
      </div>
    </div>
  {:else if events.length === 0}
    <div class="card bg-base-200">
      <div class="card-body items-center py-12 text-center">
        <p class="mb-4 text-base-content/70">You don't have any events yet.</p>
        <button type="button" onclick={createEvent} disabled={creating} class="btn btn-primary">
          Create your first event
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-3">
      {#each events as event (event.id)}
        <div class="card bg-base-200">
          <div class="card-body flex-row items-center justify-between p-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h2 class="truncate text-lg font-medium">
                  {event.title || 'Untitled'}
                </h2>
                {#if !event.isOwner}
                  <span class="badge badge-sm badge-info">Shared</span>
                {/if}
              </div>
              <p class="mt-1 text-sm text-base-content/50">
                Updated {formatDate(event.updatedAt)}
              </p>
            </div>

            <div class="ml-4 flex items-center gap-2">
              {#if event.canWrite}
                <a href={resolve(`/event/${event.id}/edit`)} class="btn btn-sm btn-primary">Edit</a>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
