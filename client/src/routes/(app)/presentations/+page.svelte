<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { toast } from '$lib/toast.svelte'
  import { auth } from '$lib/stores/auth.svelte'
  import { generatePresentationName } from '$lib/utils/name-generator'

  let creating = $state(false)

  async function createPresentation() {
    if (!auth.userChannel) return
    creating = true
    try {
      const name = generatePresentationName()
      const id = await auth.userChannel.createDocument('presentation', name)
      await goto(resolve(`/presentation/${id}/edit`))
    } catch {
      toast('error', 'Failed to create presentation')
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

  const presentations = $derived(auth.documents.filter((d) => d.type === 'presentation'))
</script>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold">Presentations</h1>
      {#if !auth.ready}
        <span class="text-sm text-base-content/50">Loading...</span>
      {/if}
    </div>
    <button type="button" onclick={createPresentation} disabled={creating} class="btn btn-primary">
      {#if creating}
        <span class="loading loading-sm loading-spinner" role="status" aria-label="Loading"></span>
        Creating...
      {:else}
        New Presentation
      {/if}
    </button>
  </div>

  {#if !auth.ready}
    <div class="card bg-base-200">
      <div class="card-body items-center py-12 text-center">
        <span class="loading loading-lg loading-spinner" role="status" aria-label="Loading"></span>
        <p class="text-base-content/70">Loading presentations...</p>
      </div>
    </div>
  {:else if presentations.length === 0}
    <div class="card bg-base-200">
      <div class="card-body items-center py-12 text-center">
        <p class="mb-4 text-base-content/70">You don't have any presentations yet.</p>
        <button type="button" onclick={createPresentation} disabled={creating} class="btn btn-primary">
          Create your first presentation
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-3">
      {#each presentations as presentation (presentation.id)}
        <div class="card bg-base-200">
          <div class="card-body flex-row items-center justify-between p-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h2 class="truncate text-lg font-medium">
                  {presentation.title || 'Untitled'}
                </h2>
                {#if presentation.isPublic}
                  <span class="badge badge-sm badge-success">Public</span>
                {:else}
                  <span class="badge badge-ghost badge-sm">Private</span>
                {/if}
                {#if !presentation.isOwner}
                  <span class="badge badge-sm badge-info">Shared</span>
                {/if}
              </div>
              <p class="mt-1 text-sm text-base-content/50">
                Updated {formatDate(presentation.updatedAt)}
              </p>
            </div>

            <div class="ml-4 flex items-center gap-2">
              <a href={resolve(`/presentation/${presentation.id}`)} class="btn btn-ghost btn-sm">View</a>
              {#if presentation.canWrite}
                <a href={resolve(`/presentation/${presentation.id}/edit`)} class="btn btn-ghost btn-sm">Edit</a>
                <a href={resolve(`/presentation/${presentation.id}/presenter`)} class="btn btn-sm btn-primary">
                  Present
                </a>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
