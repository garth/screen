<script lang="ts">
  import { resolve } from '$app/paths'
  import { goto } from '$app/navigation'
  import { toast } from '$lib/toast.svelte'
  import { theme, type ThemePreference } from '$lib/theme.svelte'
  import { auth } from '$lib/stores/auth.svelte'
  import { focusTrap } from '$lib/actions/focus-trap'

  const themeOptions: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'system', label: 'System', icon: 'hero-computer-desktop-mini' },
    { value: 'light', label: 'Light', icon: 'hero-sun-mini' },
    { value: 'dark', label: 'Dark', icon: 'hero-moon-mini' },
  ]

  // Profile form state
  let firstName = $state(auth.user?.firstName ?? '')
  let lastName = $state(auth.user?.lastName ?? '')
  let savingName = $state(false)

  // Sync from auth when it updates
  $effect(() => {
    if (auth.user) {
      firstName = auth.user.firstName
      lastName = auth.user.lastName
    }
  })

  let nameError = $state('')

  async function handleUpdateName(event: SubmitEvent) {
    event.preventDefault()
    nameError = ''
    if (!firstName.trim()) {
      nameError = 'First name is required'
      return
    }
    if (!lastName.trim()) {
      nameError = 'Last name is required'
      return
    }
    if (!auth.userChannel) return
    savingName = true
    try {
      await auth.userChannel.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() })
      toast('success', 'Name updated successfully')
    } catch {
      toast('error', 'Failed to update name')
    } finally {
      savingName = false
    }
  }

  // Password form state
  let currentPassword = $state('')
  let newPassword = $state('')
  let confirmPassword = $state('')
  let savingPassword = $state(false)
  let passwordError = $state('')

  async function handleUpdatePassword(event: SubmitEvent) {
    event.preventDefault()
    if (!auth.userChannel) return

    passwordError = ''
    if (newPassword !== confirmPassword) {
      passwordError = 'Passwords do not match'
      return
    }
    if (newPassword.length < 8) {
      passwordError = 'Password must be at least 8 characters'
      return
    }

    savingPassword = true
    try {
      await auth.userChannel.changePassword({ currentPassword, newPassword })
      toast('success', 'Password changed successfully')
      currentPassword = ''
      newPassword = ''
      confirmPassword = ''
    } catch (e) {
      passwordError = e instanceof Error ? e.message : 'Failed to change password'
    } finally {
      savingPassword = false
    }
  }

  // Delete account state
  let showDeleteDialog = $state(false)
  let deleting = $state(false)

  async function handleDeleteAccount() {
    if (!auth.userChannel) return
    deleting = true
    try {
      await auth.userChannel.deleteAccount()
      auth.destroy()
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
  <section class="card mb-8 bg-base-200">
    <div class="card-body">
      <h2 class="card-title">Profile</h2>

      <form onsubmit={handleUpdateName} class="flex flex-col gap-4">
        {#if nameError}
          <div class="alert alert-error">
            <span>{nameError}</span>
          </div>
        {/if}
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="label">
              <span class="label-text">First Name</span>
            </label>
            <input id="firstName" type="text" bind:value={firstName} class="input-bordered input w-full" />
          </div>

          <div>
            <label for="lastName" class="label">
              <span class="label-text">Last Name</span>
            </label>
            <input id="lastName" type="text" bind:value={lastName} class="input-bordered input w-full" />
          </div>
        </div>

        <button type="submit" disabled={savingName} class="btn w-fit btn-primary">
          {savingName ? 'Saving...' : 'Save Name'}
        </button>
      </form>
    </div>
  </section>

  <!-- Appearance Section -->
  <section class="card mb-8 bg-base-200">
    <div class="card-body">
      <h2 class="card-title">Appearance</h2>

      <fieldset>
        <legend class="mb-3 text-sm font-medium">Theme</legend>
        <div class="join">
          {#each themeOptions as option (option.value)}
            <button
              type="button"
              onclick={() => theme.setPreference(option.value)}
              aria-pressed={theme.preference === option.value}
              class="btn join-item {theme.preference === option.value ? 'btn-primary' : 'btn-ghost'}">
              <span class="{option.icon} size-5" aria-hidden="true"></span>
              {option.label}
            </button>
          {/each}
        </div>
      </fieldset>
    </div>
  </section>

  <!-- Security Section -->
  <section class="card mb-8 bg-base-200">
    <div class="card-body">
      <h2 class="card-title">Security</h2>

      {#if passwordError}
        <div class="alert alert-error">
          <span>{passwordError}</span>
        </div>
      {/if}

      <form onsubmit={handleUpdatePassword} class="flex flex-col gap-4">
        <div>
          <label for="currentPassword" class="label">
            <span class="label-text">Current Password</span>
          </label>
          <input
            id="currentPassword"
            type="password"
            bind:value={currentPassword}
            class="input-bordered input w-full" />
        </div>

        <div>
          <label for="newPassword" class="label">
            <span class="label-text">New Password</span>
          </label>
          <input id="newPassword" type="password" bind:value={newPassword} class="input-bordered input w-full" />
        </div>

        <div>
          <label for="confirmPassword" class="label">
            <span class="label-text">Confirm New Password</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            class="input-bordered input w-full" />
        </div>

        <button type="submit" disabled={savingPassword} class="btn w-fit btn-primary">
          {savingPassword ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  </section>

  <!-- Delete Account Section -->
  <section class="card border border-error/30 bg-base-200">
    <div class="card-body">
      <h2 class="card-title text-error">Delete Account</h2>

      <p class="text-sm text-base-content/70">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>

      <div class="mt-4 card-actions">
        <button type="button" onclick={() => (showDeleteDialog = true)} class="btn btn-error">Delete Account</button>
      </div>
    </div>
  </section>
</div>

<!-- Delete Account Confirmation Dialog -->
{#if showDeleteDialog}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-open modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-account-title"
    onkeydown={(e) => {
      if (e.key === 'Escape') showDeleteDialog = false
    }}
    use:focusTrap>
    <div class="modal-box">
      <h3 id="delete-account-title" class="text-lg font-bold text-error">Delete Account?</h3>

      <div class="space-y-3 py-4 text-sm">
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
            <span class="loading loading-sm loading-spinner" role="status" aria-label="Loading"></span>
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
