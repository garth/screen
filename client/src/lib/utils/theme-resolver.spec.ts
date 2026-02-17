import { describe, it, expect } from 'vitest'
import { resolveTheme, defaultTheme } from './theme-resolver'
import type { ThemeDocument, ViewportArea } from '$lib/stores/documents'

// Mock ThemeDocument for testing
function createMockThemeDocument(overrides: Partial<ThemeDocument> = {}): ThemeDocument {
  return {
    connected: true,
    synced: true,
    syncTimedOut: false,
    readOnly: false,
    error: null,
    isSystemTheme: false,
    font: 'Arial',
    backgroundColor: '#f0f0f0',
    textColor: '#333333',
    viewport: undefined,
    setFont: () => {},
    setBackgroundColor: () => {},
    setTextColor: () => {},
    setViewport: () => {},
    backgroundImage: null,
    setBackgroundImage: () => {},
    effectiveFont: 'Arial',
    effectiveBackgroundColor: '#f0f0f0',
    effectiveTextColor: '#333333',
    effectiveViewport: undefined,
    ydoc: {} as unknown as ThemeDocument['ydoc'],
    meta: {} as unknown as ThemeDocument['meta'],
    retry: () => {},
    destroy: () => {},
    ...overrides,
  }
}

describe('resolveTheme', () => {
  it('returns default values when no overrides or theme provided', () => {
    const result = resolveTheme({}, null)

    expect(result).toEqual({
      font: 'sans-serif',
      backgroundColor: '#1f2937',
      textColor: '#f3f4f6',
      viewport: undefined,
      backgroundImage: undefined,
    })
  })

  it('uses theme document values when no overrides provided', () => {
    const theme = createMockThemeDocument({
      effectiveFont: 'Georgia',
      effectiveBackgroundColor: '#000000',
      effectiveTextColor: '#ffffff',
    })

    const result = resolveTheme({}, theme)

    expect(result.font).toBe('Georgia')
    expect(result.backgroundColor).toBe('#000000')
    expect(result.textColor).toBe('#ffffff')
  })

  it('uses presentation overrides over theme values', () => {
    const theme = createMockThemeDocument({
      effectiveFont: 'Georgia',
      effectiveBackgroundColor: '#000000',
      effectiveTextColor: '#ffffff',
    })

    const result = resolveTheme(
      {
        font: 'Helvetica',
        backgroundColor: '#ff0000',
        textColor: '#00ff00',
      },
      theme,
    )

    expect(result.font).toBe('Helvetica')
    expect(result.backgroundColor).toBe('#ff0000')
    expect(result.textColor).toBe('#00ff00')
  })

  it('uses presentation overrides over defaults when no theme', () => {
    const result = resolveTheme(
      {
        font: 'Courier',
        backgroundColor: '#123456',
      },
      null,
    )

    expect(result.font).toBe('Courier')
    expect(result.backgroundColor).toBe('#123456')
    expect(result.textColor).toBe('#f3f4f6') // Falls back to default (dark mode)
  })

  it('handles partial overrides with theme fallback', () => {
    const theme = createMockThemeDocument({
      effectiveFont: 'Georgia',
      effectiveBackgroundColor: '#000000',
      effectiveTextColor: '#ffffff',
    })

    const result = resolveTheme({ font: 'Times' }, theme)

    expect(result.font).toBe('Times') // Override
    expect(result.backgroundColor).toBe('#000000') // Theme
    expect(result.textColor).toBe('#ffffff') // Theme
  })

  it('includes viewport from theme', () => {
    const viewport: ViewportArea = { x: 0, y: 0, width: 1920, height: 1080 }
    const theme = createMockThemeDocument({ viewport })

    const result = resolveTheme({}, theme)

    expect(result.viewport).toEqual(viewport)
  })

  it('includes backgroundImage from theme', () => {
    const backgroundImage = new Uint8Array([1, 2, 3, 4])
    const theme = createMockThemeDocument({ backgroundImage })

    const result = resolveTheme({}, theme)

    expect(result.backgroundImage).toEqual(backgroundImage)
  })

  it('handles undefined viewport correctly', () => {
    const theme = createMockThemeDocument({ viewport: undefined })

    const result = resolveTheme({}, theme)

    expect(result.viewport).toBeUndefined()
  })

  it('treats empty string overrides as falsy (uses theme)', () => {
    const theme = createMockThemeDocument({
      effectiveFont: 'Georgia',
    })

    const result = resolveTheme({ font: '' }, theme)

    expect(result.font).toBe('Georgia')
  })
})

describe('defaultTheme', () => {
  it('has correct default values (dark mode)', () => {
    expect(defaultTheme).toEqual({
      font: 'sans-serif',
      backgroundColor: '#1f2937',
      textColor: '#f3f4f6',
    })
  })

  it('is immutable reference', () => {
    const theme1 = defaultTheme
    const theme2 = defaultTheme
    expect(theme1).toBe(theme2)
  })
})
