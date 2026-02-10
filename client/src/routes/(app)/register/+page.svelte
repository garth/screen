<script lang="ts">
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import { register } from './data.remote'

  let registeredEmail = $state<string | null>(null)
  let submittedEmail = $state('')

  // Pre-fill email from query param (from invite flow)
  const prefillEmail = $derived(page.url.searchParams.get('email') ?? '')
  const inviteToken = $derived(page.url.searchParams.get('invite_token') ?? '')
</script>

<div class="mx-auto max-w-md p-6">
  <h1 class="mb-6 text-2xl font-bold">Create Account</h1>

  {#if inviteToken}
    <p class="mb-6 text-base-content/70">Create an account to accept the colleague invitation.</p>
  {/if}

  {#if registeredEmail}
    <div class="card bg-success/10 border border-success">
      <div class="card-body items-center text-center">
        <svg class="h-12 w-12 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 class="card-title">Check your email</h2>
        <p>
          We've sent a verification link to <strong>{registeredEmail}</strong>
        </p>
        <p class="text-sm text-base-content/70">Click the link in the email to verify your account and log in.</p>
        {#if inviteToken}
          <p class="mt-4 text-sm text-base-content/70">
            After verifying your email, click the invitation link again to complete the connection.
          </p>
        {/if}
      </div>
    </div>
  {:else}
    <form
      {...register.enhance(async ({ submit, form }) => {
        const formData = new FormData(form)
        submittedEmail = formData.get('email') as string
        try {
          await submit()
          // Check if there are any validation issues (including server-side like duplicate email)
          const firstNameIssues = register.fields.firstName.issues() ?? []
          const lastNameIssues = register.fields.lastName.issues() ?? []
          const emailIssues = register.fields.email.issues() ?? []
          const passwordIssues = register.fields._password.issues() ?? []
          const hasErrors =
            firstNameIssues.length > 0 ||
            lastNameIssues.length > 0 ||
            emailIssues.length > 0 ||
            passwordIssues.length > 0
          if (!hasErrors) {
            registeredEmail = submittedEmail
          }
        } catch {
          // Server error - don't show success
        }
      })}
      class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="firstName" class="label">
            <span class="label-text">First Name</span>
          </label>
          {#each register.fields.firstName.issues() as issue (issue.message)}
            <p class="text-sm text-error">{issue.message}</p>
          {/each}
          <input id="firstName" {...register.fields.firstName.as('text')} class="input input-bordered w-full" />
        </div>

        <div>
          <label for="lastName" class="label">
            <span class="label-text">Last Name</span>
          </label>
          {#each register.fields.lastName.issues() as issue (issue.message)}
            <p class="text-sm text-error">{issue.message}</p>
          {/each}
          <input id="lastName" {...register.fields.lastName.as('text')} class="input input-bordered w-full" />
        </div>
      </div>

      <div>
        <label for="email" class="label">
          <span class="label-text">Email</span>
        </label>
        {#each register.fields.email.issues() as issue (issue.message)}
          <p class="text-sm text-error">{issue.message}</p>
        {/each}
        <input
          id="email"
          {...register.fields.email.as('email')}
          value={prefillEmail || undefined}
          class="input input-bordered w-full" />
      </div>

      <div>
        <label for="password" class="label">
          <span class="label-text">Password</span>
        </label>
        {#each register.fields._password.issues() as issue (issue.message)}
          <p class="text-sm text-error">{issue.message}</p>
        {/each}
        <input id="password" {...register.fields._password.as('password')} class="input input-bordered w-full" />
      </div>

      <button type="submit" class="btn btn-primary w-full">Register</button>
    </form>

    <p class="mt-4 text-center text-sm">
      Already have an account? <a href={resolve('/login')} class="link link-primary">Log in</a>
    </p>
  {/if}
</div>
