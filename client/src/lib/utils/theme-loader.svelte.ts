import { untrack } from 'svelte'
import { createThemeDoc, type ThemeDocument } from '$lib/stores/documents'

export interface ThemeLoaderOptions {
  getSynced: () => boolean
  getThemeId: () => string | null | undefined
}

/**
 * Manages a theme document lifecycle reactively.
 * Creates/destroys theme documents when synced state or themeId changes.
 * Uses untrack() to prevent infinite effect loops when reading themeDoc for cleanup.
 *
 * Must be called within a component script or $effect.root scope.
 */
export function createThemeLoader(options: ThemeLoaderOptions) {
  let themeDoc = $state<ThemeDocument | null>(null)

  $effect(() => {
    const synced = options.getSynced()
    const themeId = options.getThemeId()

    if (synced && themeId) {
      untrack(() => themeDoc?.destroy())
      themeDoc = createThemeDoc({ documentId: themeId })
    } else if (synced && !themeId) {
      untrack(() => themeDoc?.destroy())
      themeDoc = null
    }
  })

  return {
    get current() {
      return themeDoc
    },
    destroy() {
      themeDoc?.destroy()
    },
  }
}
