<script lang="ts">
  import { resolve } from '$app/paths'
  import { resetPassword } from './data.remote'

  let { data } = $props()
</script>

<div class="mx-auto max-w-md p-6">
  <h1 class="mb-6 text-2xl font-bold text-gray-200">Reset Password</h1>

  {#if data.error}
    <div class="rounded-lg border border-red-700 bg-red-900/30 p-6 text-center">
      <svg class="mx-auto mb-4 h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h2 class="mb-2 text-xl font-semibold text-gray-100">Reset Failed</h2>
      <p class="mb-4 text-gray-300">{data.error}</p>
      <a
        href={resolve('/forgot-password')}
        class="inline-block rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
        Request New Link
      </a>
    </div>
  {:else}
    <p class="mb-6 text-gray-300">Enter your new password below.</p>

    <form
      {...resetPassword.enhance(async ({ submit }) => {
        await submit()
      })}
      class="space-y-4">
      <input type="hidden" name="token" value={data.token} />

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-200">
          New Password
          {#each resetPassword.fields._password.issues() as issue (issue.message)}
            <span class="text-red-400"> - {issue.message}</span>
          {/each}
        </span>
        <input
          {...resetPassword.fields._password.as('password')}
          class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-200">
          Confirm Password
          {#each resetPassword.fields._confirmPassword.issues() as issue (issue.message)}
            <span class="text-red-400"> - {issue.message}</span>
          {/each}
        </span>
        <input
          {...resetPassword.fields._confirmPassword.as('password')}
          class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
      </label>

      <button type="submit" class="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
        Reset Password
      </button>
    </form>
  {/if}
</div>
