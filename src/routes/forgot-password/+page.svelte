<script lang="ts">
  import { resolve } from '$app/paths'
  import { forgotPassword } from './data.remote'

  let emailSent = $state(false)
  let submittedEmail = $state('')
</script>

<div class="mx-auto max-w-md p-6">
  <h1 class="mb-6 text-2xl font-bold">Forgot Password</h1>

  {#if emailSent}
    <div class="card bg-base-200 border border-base-300">
      <div class="card-body items-center text-center">
        <svg class="h-12 w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 class="card-title">Check your email</h2>
        <p>
          If an account exists for <span class="font-medium">{submittedEmail}</span>, we've sent a password reset link.
        </p>
        <p class="text-sm text-base-content/70">The link expires in 1 hour.</p>
        <a href={resolve('/login')} class="link link-primary mt-4">Back to login</a>
      </div>
    </div>
  {:else}
    <p class="mb-6 text-base-content/70">Enter your email address and we'll send you a link to reset your password.</p>

    <form
      {...forgotPassword.enhance(async ({ submit }) => {
        const emailInput = document.querySelector<HTMLInputElement>('input[type="email"]')
        submittedEmail = emailInput?.value ?? ''
        await submit()
        emailSent = true
      })}
      class="flex flex-col gap-4">
      <div>
        <label for="email" class="label">
          <span class="label-text">Email</span>
        </label>
        {#each forgotPassword.fields.email.issues() as issue (issue.message)}
          <p class="text-sm text-error">{issue.message}</p>
        {/each}
        <input id="email" {...forgotPassword.fields.email.as('email')} class="input input-bordered w-full" />
      </div>

      <button type="submit" class="btn btn-primary w-full">Send Reset Link</button>
    </form>

    <p class="mt-4 text-center text-sm">
      Remember your password? <a href={resolve('/login')} class="link link-primary">Log in</a>
    </p>
  {/if}
</div>
