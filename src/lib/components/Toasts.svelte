<script lang="ts">
  import { fly } from 'svelte/transition'
  import { toastStore, dismiss } from '$lib/toast.svelte'
</script>

<div class="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
  {#each toastStore.items as toast (toast.id)}
    <div
      in:fly={{ x: 100, duration: 200 }}
      out:fly={{ x: 100, duration: 150 }}
      class="pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg {toast.type === 'success' ?
        'border border-green-700 bg-green-900/90 text-green-100'
      : 'border border-red-700 bg-red-900/90 text-red-100'}"
      role="alert">
      {#if toast.type === 'success'}
        <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      {:else}
        <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      {/if}
      <span class="text-sm">{toast.message}</span>
      <button onclick={() => dismiss(toast.id)} class="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>
