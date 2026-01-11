<script lang="ts">
  import { resolve } from '$app/paths'
  import { goto } from '$app/navigation'
  import { toast } from '$lib/toast.svelte'
  import { updateName, updatePassword, deleteAccount } from './data.remote'

  let { data } = $props()

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
  <h1 class="mb-6 text-2xl font-bold text-gray-200">Preferences</h1>

  <!-- Profile Section -->
  <section class="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
    <h2 class="mb-4 text-lg font-semibold text-gray-100">Profile</h2>

    <form
      {...updateName.enhance(async ({ submit }) => {
        try {
          await submit()
          toast('success', 'Name updated successfully')
        } catch {
          toast('error', 'Failed to update name')
        }
      })}
      class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-200">
            First Name
            {#each updateName.fields.firstName.issues() as issue (issue.message)}
              <span class="text-red-400"> - {issue.message}</span>
            {/each}
          </span>
          <input
            {...updateName.fields.firstName.as('text')}
            value={data.user.firstName}
            class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
        </label>

        <label class="block">
          <span class="mb-1 block text-sm font-medium text-gray-200">
            Last Name
            {#each updateName.fields.lastName.issues() as issue (issue.message)}
              <span class="text-red-400"> - {issue.message}</span>
            {/each}
          </span>
          <input
            {...updateName.fields.lastName.as('text')}
            value={data.user.lastName}
            class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
        </label>
      </div>

      <button type="submit" class="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
        Save Name
      </button>
    </form>
  </section>

  <!-- Security Section -->
  <section class="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
    <h2 class="mb-4 text-lg font-semibold text-gray-100">Security</h2>

    {#if updatePassword.error}
      <div class="mb-4 rounded border border-red-600 bg-red-900/50 px-4 py-3 text-red-300">
        {updatePassword.error.message}
      </div>
    {/if}

    <form
      {...updatePassword.enhance(async ({ submit, form }) => {
        await submit()
        toast('success', 'Password changed successfully')
        form.reset()
      })}
      class="space-y-4">
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-200">
          Current Password
          {#each updatePassword.fields.currentPassword.issues() as issue (issue.message)}
            <span class="text-red-400"> - {issue.message}</span>
          {/each}
        </span>
        <input
          {...updatePassword.fields.currentPassword.as('password')}
          class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-200">
          New Password
          {#each updatePassword.fields.newPassword.issues() as issue (issue.message)}
            <span class="text-red-400"> - {issue.message}</span>
          {/each}
        </span>
        <input
          {...updatePassword.fields.newPassword.as('password')}
          class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-200">
          Confirm New Password
          {#each updatePassword.fields.confirmPassword.issues() as issue (issue.message)}
            <span class="text-red-400"> - {issue.message}</span>
          {/each}
        </span>
        <input
          {...updatePassword.fields.confirmPassword.as('password')}
          class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
      </label>

      <button type="submit" class="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500">
        Change Password
      </button>
    </form>
  </section>

  <!-- Delete Account Section -->
  <section class="mt-8 rounded-lg border border-red-900 bg-gray-800 p-6">
    <h2 class="mb-4 text-lg font-semibold text-red-400">Delete Account</h2>

    <p class="mb-4 text-sm text-gray-300">
      Permanently delete your account and all associated data. This action cannot be undone.
    </p>

    <button
      type="button"
      onclick={() => (showDeleteDialog = true)}
      class="rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500">
      Delete Account
    </button>
  </section>
</div>

<!-- Delete Account Confirmation Dialog -->
{#if showDeleteDialog}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onclick={() => (showDeleteDialog = false)}
    onkeydown={(e) => e.key === 'Escape' && (showDeleteDialog = false)}
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-dialog-title"
    tabindex="-1">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-xl"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}>
      <h3 id="delete-dialog-title" class="mb-4 text-xl font-semibold text-red-400">Delete Account?</h3>

      <div class="mb-6 space-y-3 text-sm text-gray-300">
        <p>
          <strong class="text-gray-100">Warning:</strong> This will permanently delete your account and all your data, including:
        </p>
        <ul class="ml-4 list-disc space-y-1">
          <li>All your presentations</li>
          <li>Your account settings</li>
        </ul>
        <p class="text-yellow-300">This action cannot be undone.</p>
      </div>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          onclick={() => (showDeleteDialog = false)}
          disabled={deleting}
          class="rounded border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 disabled:opacity-50">
          Cancel
        </button>
        <button
          type="button"
          onclick={handleDeleteAccount}
          disabled={deleting}
          class="rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500 disabled:opacity-50">
          {#if deleting}
            Deleting...
          {:else}
            Delete My Account
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
