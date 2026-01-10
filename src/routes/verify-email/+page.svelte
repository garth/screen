<script lang="ts">
  import { resolve } from '$app/paths'

  let { data } = $props()
</script>

<div class="mx-auto max-w-md p-6">
  {#if data.error}
    <div class="rounded-lg border border-red-700 bg-red-900/30 p-6 text-center">
      <svg class="mx-auto mb-4 h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h1 class="mb-2 text-xl font-semibold text-gray-100">Verification Failed</h1>
      <p class="mb-4 text-gray-300">{data.error}</p>
      <a
        href={resolve('/register')}
        class="inline-block rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
        Register Again
      </a>
    </div>
  {:else}
    <div class="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center">
      <p class="text-gray-300">Verifying your email...</p>
    </div>
  {/if}
</div>
