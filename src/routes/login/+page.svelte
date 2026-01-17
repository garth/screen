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
  <h1 class="mb-6 text-2xl font-bold">Log In</h1>

  <form
    {...login.enhance(async ({ submit }) => {
      try {
        await submit()
        // Redirect happens on success, so no toast needed
      } catch {
        toast('error', 'Login failed')
      }
    })}
    class="flex flex-col gap-4">
    {#if redirectTo}
      <input type="hidden" name="redirectTo" value={redirectTo} />
    {/if}
    <div>
      <label for="email" class="label">
        <span class="label-text">Email</span>
      </label>
      {#each login.fields.email.issues() as issue (issue.message)}
        <p class="text-sm text-error">{issue.message}</p>
      {/each}
      <input id="email" {...login.fields.email.as('email')} class="input input-bordered w-full" />
    </div>

    <div>
      <label for="password" class="label">
        <span class="label-text">Password</span>
      </label>
      {#each login.fields._password.issues() as issue (issue.message)}
        <p class="text-sm text-error">{issue.message}</p>
      {/each}
      <input id="password" {...login.fields._password.as('password')} class="input input-bordered w-full" />
    </div>

    <button type="submit" class="btn btn-primary w-full">Log In</button>
  </form>

  <div class="mt-4 space-y-2 text-center text-sm">
    <p>
      <a href={resolve('/forgot-password')} class="link link-primary">Forgot your password?</a>
    </p>
    <p>
      Don't have an account? <a href={resolve('/register')} class="link link-primary">Register</a>
    </p>
  </div>
</div>
