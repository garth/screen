<script lang="ts">
  import { resolve } from '$app/paths'

  let { data } = $props()
</script>

<div class="mx-auto max-w-md p-6">
  {#if data.error}
    <div class="card bg-error/10 border border-error">
      <div class="card-body items-center text-center">
        <svg class="h-12 w-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 class="card-title">Verification Failed</h1>
        <p>{data.error}</p>
        <a href={resolve('/register')} class="btn btn-primary mt-2">Register Again</a>
      </div>
    </div>
  {:else}
    <div class="card bg-base-200 border border-base-300">
      <div class="card-body items-center text-center">
        <span class="loading loading-spinner loading-lg"></span>
        <p>Verifying your email...</p>
      </div>
    </div>
  {/if}
</div>
