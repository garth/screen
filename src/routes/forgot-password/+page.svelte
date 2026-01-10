<script lang="ts">
  import { resolve } from '$app/paths'
  import { forgotPassword } from './data.remote'

  let emailSent = $state(false)
  let submittedEmail = $state('')
</script>

<div class="mx-auto max-w-md p-6">
  <h1 class="mb-6 text-2xl font-bold text-gray-200">Forgot Password</h1>

  {#if emailSent}
    <div class="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center">
      <svg class="mx-auto mb-4 h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <h2 class="mb-2 text-xl font-semibold text-gray-100">Check your email</h2>
      <p class="mb-4 text-gray-300">
        If an account exists for <span class="font-medium text-gray-100">{submittedEmail}</span>, we've sent a password
        reset link.
      </p>
      <p class="text-sm text-gray-400">The link expires in 1 hour.</p>
      <a href={resolve('/login')} class="mt-4 inline-block text-blue-400 hover:underline">Back to login</a>
    </div>
  {:else}
    <p class="mb-6 text-gray-300">Enter your email address and we'll send you a link to reset your password.</p>

    <form
      {...forgotPassword.enhance(async ({ submit }) => {
        const emailInput = document.querySelector<HTMLInputElement>('input[type="email"]')
        submittedEmail = emailInput?.value ?? ''
        await submit()
        emailSent = true
      })}
      class="space-y-4">
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-200">
          Email
          {#each forgotPassword.fields.email.issues() as issue (issue.message)}
            <span class="text-red-400"> - {issue.message}</span>
          {/each}
        </span>
        <input
          {...forgotPassword.fields.email.as('email')}
          class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
      </label>

      <button type="submit" class="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
        Send Reset Link
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-400">
      Remember your password? <a href={resolve('/login')} class="text-blue-400 hover:underline">Log in</a>
    </p>
  {/if}
</div>
