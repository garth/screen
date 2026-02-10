<script lang="ts">
  import { resolve } from '$app/paths'
  import { goto } from '$app/navigation'
  import { toast } from '$lib/toast.svelte'
  import { theme, type ThemePreference } from '$lib/theme.svelte'
  import { updateName, updatePassword, deleteAccount } from './data.remote'

  let { data } = $props()

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  // Delete account state
  let showDeleteDialog = $state(false)
  let deleting = $state(false)

  async function handleDeleteAccount() {
    deleting = true
    try {
      await deleteAccount()
      await goto(resolve('/'))
    } catch {
      toast('error', 'Failed to delete account')
      deleting = false
    }
  }
</script>

<div class="mx-auto max-w-4xl p-6">
  <h1 class="mb-6 text-2xl font-bold">Preferences</h1>

  <!-- Profile Section -->
  <section class="card bg-base-200 mb-8">
    <div class="card-body">
      <h2 class="card-title">Profile</h2>

      <form
        {...updateName.enhance(async ({ submit }) => {
          try {
            await submit()
            toast('success', 'Name updated successfully')
          } catch {
            toast('error', 'Failed to update name')
          }
        })}
        class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="label">
              <span class="label-text">First Name</span>
            </label>
            {#each updateName.fields.firstName.issues() as issue (issue.message)}
              <p class="text-sm text-error">{issue.message}</p>
            {/each}
            <input
              id="firstName"
              {...updateName.fields.firstName.as('text')}
              value={data.user.firstName}
              class="input input-bordered w-full" />
          </div>

          <div>
            <label for="lastName" class="label">
              <span class="label-text">Last Name</span>
            </label>
            {#each updateName.fields.lastName.issues() as issue (issue.message)}
              <p class="text-sm text-error">{issue.message}</p>
            {/each}
            <input
              id="lastName"
              {...updateName.fields.lastName.as('text')}
              value={data.user.lastName}
              class="input input-bordered w-full" />
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-fit">Save Name</button>
      </form>
    </div>
  </section>

  <!-- Appearance Section -->
  <section class="card bg-base-200 mb-8">
    <div class="card-body">
      <h2 class="card-title">Appearance</h2>

      <fieldset>
        <legend class="mb-3 text-sm font-medium">Theme</legend>
        <div class="join">
          {#each themeOptions as option (option.value)}
            <button
              type="button"
              onclick={() => theme.setPreference(option.value)}
              class="btn join-item {theme.preference === option.value ? 'btn-primary' : 'btn-ghost'}">
              {option.label}
            </button>
          {/each}
        </div>
      </fieldset>
    </div>
  </section>

  <!-- Security Section -->
  <section class="card bg-base-200 mb-8">
    <div class="card-body">
      <h2 class="card-title">Security</h2>

      {#if updatePassword.error}
        <div class="alert alert-error">
          <span>{updatePassword.error.message}</span>
        </div>
      {/if}

      <form
        {...updatePassword.enhance(async ({ submit, form }) => {
          await submit()
          toast('success', 'Password changed successfully')
          form.reset()
        })}
        class="flex flex-col gap-4">
        <div>
          <label for="currentPassword" class="label">
            <span class="label-text">Current Password</span>
          </label>
          {#each updatePassword.fields.currentPassword.issues() as issue (issue.message)}
            <p class="text-sm text-error">{issue.message}</p>
          {/each}
          <input
            id="currentPassword"
            {...updatePassword.fields.currentPassword.as('password')}
            class="input input-bordered w-full" />
        </div>

        <div>
          <label for="newPassword" class="label">
            <span class="label-text">New Password</span>
          </label>
          {#each updatePassword.fields.newPassword.issues() as issue (issue.message)}
            <p class="text-sm text-error">{issue.message}</p>
          {/each}
          <input
            id="newPassword"
            {...updatePassword.fields.newPassword.as('password')}
            class="input input-bordered w-full" />
        </div>

        <div>
          <label for="confirmPassword" class="label">
            <span class="label-text">Confirm New Password</span>
          </label>
          {#each updatePassword.fields.confirmPassword.issues() as issue (issue.message)}
            <p class="text-sm text-error">{issue.message}</p>
          {/each}
          <input
            id="confirmPassword"
            {...updatePassword.fields.confirmPassword.as('password')}
            class="input input-bordered w-full" />
        </div>

        <button type="submit" class="btn btn-primary w-fit">Change Password</button>
      </form>
    </div>
  </section>

  <!-- Delete Account Section -->
  <section class="card bg-base-200 border border-error/30">
    <div class="card-body">
      <h2 class="card-title text-error">Delete Account</h2>

      <p class="text-sm text-base-content/70">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>

      <div class="card-actions mt-4">
        <button type="button" onclick={() => (showDeleteDialog = true)} class="btn btn-error">Delete Account</button>
      </div>
    </div>
  </section>
</div>

<!-- Delete Account Confirmation Dialog -->
{#if showDeleteDialog}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="text-lg font-bold text-error">Delete Account?</h3>

      <div class="py-4 space-y-3 text-sm">
        <p>
          <strong>Warning:</strong> This will permanently delete your account and all your data, including:
        </p>
        <ul class="ml-4 list-disc space-y-1">
          <li>All your presentations</li>
          <li>Your account settings</li>
        </ul>
        <p class="text-warning">This action cannot be undone.</p>
      </div>

      <div class="modal-action">
        <button type="button" onclick={() => (showDeleteDialog = false)} disabled={deleting} class="btn btn-ghost">
          Cancel
        </button>
        <button type="button" onclick={handleDeleteAccount} disabled={deleting} class="btn btn-error">
          {#if deleting}
            <span class="loading loading-spinner loading-sm"></span>
            Deleting...
          {:else}
            Delete My Account
          {/if}
        </button>
      </div>
    </div>
    <div class="modal-backdrop" onclick={() => (showDeleteDialog = false)}></div>
  </div>
{/if}
