<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { browser } from '$app/environment'
  import { toast } from '$lib/toast.svelte'
  import { createDocumentListDoc, type DocumentListDocument } from '$lib/stores/documents'

  let { data } = $props()

  let creating = $state(false)
  let docList: DocumentListDocument | null = $state(null)

  onMount(() => {
    if (browser) {
      docList = createDocumentListDoc({ userId: data.userId })
    }
  })

  onDestroy(() => {
    docList?.destroy()
  })

  async function createPresentation() {
    creating = true
    try {
      const response = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to create presentation')
      }

      const { id } = await response.json()
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

  // Derived state from document list
  const presentations = $derived(docList?.presentations ?? [])
  const connected = $derived(docList?.connected ?? false)
  const synced = $derived(docList?.synced ?? false)
</script>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold text-gray-200">Presentations</h1>
      {#if !synced}
        <span class="text-sm text-gray-500">Loading...</span>
      {:else if !connected}
        <span class="flex items-center gap-1 text-sm text-yellow-500">
          <span class="inline-block h-2 w-2 rounded-full bg-yellow-500"></span>
          Offline
        </span>
      {/if}
    </div>
    <button
      type="button"
      onclick={createPresentation}
      disabled={creating}
      class="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50">
      {#if creating}
        Creating...
      {:else}
        New Presentation
      {/if}
    </button>
  </div>

  {#if !synced}
    <div class="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
      <p class="text-gray-400">Loading presentations...</p>
    </div>
  {:else if presentations.length === 0}
    <div class="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
      <p class="mb-4 text-gray-400">You don't have any presentations yet.</p>
      <button
        type="button"
        onclick={createPresentation}
        disabled={creating}
        class="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50">
        Create your first presentation
      </button>
    </div>
  {:else}
    <div class="space-y-3">
      {#each presentations as presentation (presentation.id)}
        <div class="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h2 class="truncate text-lg font-medium text-gray-100">
                {presentation.title || 'Untitled'}
              </h2>
              {#if presentation.isPublic}
                <span class="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">Public</span>
              {:else}
                <span class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">Private</span>
              {/if}
              {#if !presentation.isOwner}
                <span class="rounded bg-blue-900 px-2 py-0.5 text-xs text-blue-300">Shared</span>
              {/if}
            </div>
            <p class="mt-1 text-sm text-gray-500">
              Updated {formatDate(presentation.updatedAt)}
            </p>
          </div>

          <div class="ml-4 flex items-center gap-2">
            <a
              href={resolve(`/presentation/${presentation.id}`)}
              class="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700">
              View
            </a>
            {#if presentation.canWrite}
              <a
                href={resolve(`/presentation/${presentation.id}/edit`)}
                class="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700">
                Edit
              </a>
              <a
                href={resolve(`/presentation/${presentation.id}/presenter`)}
                class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
                Present
              </a>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
