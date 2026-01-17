<script lang="ts">
  import { fly } from 'svelte/transition'
  import { toastStore, dismiss } from '$lib/toast.svelte'
</script>

<div class="toast toast-end toast-top z-50">
  {#each toastStore.items as toast (toast.id)}
    <div
      in:fly={{ x: 100, duration: 200 }}
      out:fly={{ x: 100, duration: 150 }}
      class="alert {toast.type === 'success' ? 'alert-success' : 'alert-error'}"
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
      <button onclick={() => dismiss(toast.id)} class="btn btn-ghost btn-xs" aria-label="Dismiss">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>
