<script lang="ts">
  import { resolve } from '$app/paths'
  import { resetPassword } from './data.remote'

  let { data } = $props()
</script>

<div class="mx-auto max-w-md p-6">
  <h1 class="mb-6 text-2xl font-bold">Reset Password</h1>

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
        <h2 class="card-title">Reset Failed</h2>
        <p>{data.error}</p>
        <a href={resolve('/forgot-password')} class="btn btn-primary mt-2">Request New Link</a>
      </div>
    </div>
  {:else}
    <p class="mb-6 text-base-content/70">Enter your new password below.</p>

    <form
      {...resetPassword.enhance(async ({ submit }) => {
        await submit()
      })}
      class="flex flex-col gap-4">
      <input type="hidden" name="token" value={data.token} />

      <div>
        <label for="password" class="label">
          <span class="label-text">New Password</span>
        </label>
        {#each resetPassword.fields._password.issues() as issue (issue.message)}
          <p class="text-sm text-error">{issue.message}</p>
        {/each}
        <input id="password" {...resetPassword.fields._password.as('password')} class="input input-bordered w-full" />
      </div>

      <div>
        <label for="confirmPassword" class="label">
          <span class="label-text">Confirm Password</span>
        </label>
        {#each resetPassword.fields._confirmPassword.issues() as issue (issue.message)}
          <p class="text-sm text-error">{issue.message}</p>
        {/each}
        <input
          id="confirmPassword"
          {...resetPassword.fields._confirmPassword.as('password')}
          class="input input-bordered w-full" />
      </div>

      <button type="submit" class="btn btn-primary w-full">Reset Password</button>
    </form>
  {/if}
</div>
