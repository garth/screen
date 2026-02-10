import type { ThemeDocument, ViewportArea } from '$lib/stores/documents'

export interface ResolvedTheme {
  font: string
  backgroundColor: string
  textColor: string
  viewport?: ViewportArea
  backgroundImage?: Uint8Array | null
}

export interface PresentationOverrides {
  font?: string
  backgroundColor?: string
  textColor?: string
}

/**
 * Resolves the final theme values using the cascade:
 * 1. Presentation-level overrides (highest priority)
 * 2. Theme document values
 * 3. Default values (lowest priority)
 */
export function resolveTheme(overrides: PresentationOverrides, theme: ThemeDocument | null): ResolvedTheme {
  return {
    font: overrides.font || theme?.effectiveFont || 'sans-serif',
    backgroundColor: overrides.backgroundColor || theme?.effectiveBackgroundColor || '#1f2937',
    textColor: overrides.textColor || theme?.effectiveTextColor || '#f3f4f6',
    viewport: theme?.viewport ?? undefined,
    backgroundImage: theme?.backgroundImage,
  }
}

/**
 * Default theme for when no theme is selected (dark mode)
 */
export const defaultTheme: ResolvedTheme = {
  font: 'sans-serif',
  backgroundColor: '#1f2937',
  textColor: '#f3f4f6',
}
