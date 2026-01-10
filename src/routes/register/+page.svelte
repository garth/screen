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
  <h1 class="mb-6 text-2xl font-bold text-gray-200">Create Account</h1>

  {#if inviteToken}
    <p class="mb-6 text-gray-400">Create an account to accept the colleague invitation.</p>
  {/if}

  {#if registeredEmail}
    <div class="rounded-lg border border-green-700 bg-green-900/30 p-6 text-center">
      <svg class="mx-auto mb-4 h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <h2 class="mb-2 text-xl font-semibold text-gray-100">Check your email</h2>
      <p class="mb-4 text-gray-300">
        We've sent a verification link to <strong class="text-gray-100">{registeredEmail}</strong>
      </p>
      <p class="text-sm text-gray-400">Click the link in the email to verify your account and log in.</p>
      {#if inviteToken}
        <p class="mt-4 text-sm text-gray-400">
          After verifying your email, click the invitation link again to complete the connection.
        </p>
      {/if}
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
      class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-200">First Name</span>
          {#each register.fields.firstName.issues() as issue (issue.message)}
            <p class="text-sm text-red-400">{issue.message}</p>
          {/each}
          <input
            {...register.fields.firstName.as('text')}
            class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-200">Last Name</span>
          {#each register.fields.lastName.issues() as issue (issue.message)}
            <p class="text-sm text-red-400">{issue.message}</p>
          {/each}
          <input
            {...register.fields.lastName.as('text')}
            class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
        </label>
      </div>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-200">Email</span>
        {#each register.fields.email.issues() as issue (issue.message)}
          <p class="text-sm text-red-400">{issue.message}</p>
        {/each}
        <input
          {...register.fields.email.as('email')}
          value={prefillEmail || undefined}
          class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-200">Password</span>
        {#each register.fields._password.issues() as issue (issue.message)}
          <p class="text-sm text-red-400">{issue.message}</p>
        {/each}
        <input
          {...register.fields._password.as('password')}
          class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
      </label>

      <button type="submit" class="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
        Register
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-400">
      Already have an account? <a href={resolve('/login')} class="text-blue-400 hover:underline">Log in</a>
    </p>
  {/if}
</div>
