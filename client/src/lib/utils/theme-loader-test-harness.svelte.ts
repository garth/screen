import { createThemeLoader } from './theme-loader.svelte'

/**
 * Test harness that wraps createThemeLoader with $effect.root and $state inputs.
 * This file must be .svelte.ts so the Svelte compiler processes the runes.
 */
export function createTestHarness() {
  let synced = $state(false)
  let themeId = $state<string | null | undefined>(null)

  let loader!: ReturnType<typeof createThemeLoader>

  const teardown = $effect.root(() => {
    loader = createThemeLoader({
      getSynced: () => synced,
      getThemeId: () => themeId,
    })
  })

  return {
    set synced(v: boolean) {
      synced = v
    },
    set themeId(v: string | null | undefined) {
      themeId = v
    },
    get current() {
      return loader.current
    },
    cleanup() {
      loader.destroy()
      teardown()
    },
  }
}
