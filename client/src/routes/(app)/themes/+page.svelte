<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { toast } from '$lib/toast.svelte'
  import { auth } from '$lib/stores/auth.svelte'

  let creating = $state(false)

  async function createTheme() {
    if (!auth.userChannel) return
    creating = true
    try {
      const id = await auth.userChannel.createDocument('theme')
      await goto(resolve(`/theme/${id}/edit`))
    } catch {
      toast('error', 'Failed to create theme')
      creating = false
    }
  }

  const systemThemes = $derived(auth.themes.filter((t) => t.isSystemTheme))
  const userThemes = $derived(auth.themes.filter((t) => !t.isSystemTheme))
</script>

<div class="mx-auto max-w-4xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Themes</h1>
    <button type="button" onclick={createTheme} disabled={creating} class="btn btn-primary">
      {#if creating}
        <span class="loading loading-sm loading-spinner"></span>
        Creating...
      {:else}
        New Theme
      {/if}
    </button>
  </div>

  {#if systemThemes.length > 0}
    <section class="mb-8">
      <h2 class="mb-3 text-lg font-semibold text-base-content/70">System Themes</h2>
      <div class="space-y-3">
        {#each systemThemes as theme (theme.id)}
          <div class="card bg-base-200">
            <div class="card-body flex-row items-center justify-between p-4">
              <div class="flex items-center gap-2">
                <h3 class="font-medium">{theme.name}</h3>
                <span class="badge badge-ghost badge-sm">System</span>
              </div>
              <a href={resolve(`/theme/${theme.id}/edit`)} class="btn btn-ghost btn-sm">View</a>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <section>
    <h2 class="mb-3 text-lg font-semibold text-base-content/70">Your Themes</h2>
    {#if userThemes.length === 0}
      <div class="card bg-base-200">
        <div class="card-body items-center py-12 text-center">
          <p class="mb-4 text-base-content/70">You don't have any custom themes yet.</p>
          <button type="button" onclick={createTheme} disabled={creating} class="btn btn-primary">
            Create your first theme
          </button>
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        {#each userThemes as theme (theme.id)}
          <div class="card bg-base-200">
            <div class="card-body flex-row items-center justify-between p-4">
              <h3 class="font-medium">{theme.name}</h3>
              <a href={resolve(`/theme/${theme.id}/edit`)} class="btn btn-sm btn-primary">Edit</a>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
