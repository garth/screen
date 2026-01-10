<script lang="ts">
  import { untrack } from 'svelte'
  import { toast } from '$lib/toast.svelte'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import { login } from './data.remote'

  let { data } = $props()

  // Get redirect URL from query params
  const redirectTo = $derived(page.url.searchParams.get('redirect') ?? '')

  // Show success toast if email was just verified (run once on mount)
  // svelte-ignore state_referenced_locally
  if (data.verified) {
    untrack(() => toast('success', 'Email verified! You can now log in.'))
  }

  // Show success toast if password was just reset
  // svelte-ignore state_referenced_locally
  if (data.reset) {
    untrack(() => toast('success', 'Password reset! You can now log in.'))
  }
</script>

<div class="mx-auto max-w-md p-6">
  <h1 class="mb-6 text-2xl font-bold text-gray-200">Log In</h1>

  <form
    {...login.enhance(async ({ submit }) => {
      try {
        await submit()
        // Redirect happens on success, so no toast needed
      } catch {
        toast('error', 'Login failed')
      }
    })}
    class="space-y-4">
    {#if redirectTo}
      <input type="hidden" name="redirectTo" value={redirectTo} />
    {/if}
    <label class="block">
      <span class="mb-1 block text-sm font-medium text-gray-200">Email</span>
      {#each login.fields.email.issues() as issue (issue.message)}
        <p class="text-sm text-red-400">{issue.message}</p>
      {/each}
      <input
        {...login.fields.email.as('email')}
        class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
    </label>

    <label class="block">
      <span class="mb-1 block text-sm font-medium text-gray-200">Password</span>
      {#each login.fields._password.issues() as issue (issue.message)}
        <p class="text-sm text-red-400">{issue.message}</p>
      {/each}
      <input
        {...login.fields._password.as('password')}
        class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
    </label>

    <button type="submit" class="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
      Log In
    </button>
  </form>

  <div class="mt-4 space-y-2 text-center text-sm text-gray-400">
    <p>
      <a href={resolve('/forgot-password')} class="text-blue-400 hover:underline">Forgot your password?</a>
    </p>
    <p>
      Don't have an account? <a href={resolve('/register')} class="text-blue-400 hover:underline">Register</a>
    </p>
  </div>
</div>
