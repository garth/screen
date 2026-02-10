import { createBaseDocument, createReactiveMetaProperty } from './base.svelte'
import type { DocumentOptions, ThemeDocument, ViewportArea } from './types'

export function createThemeDoc(options: DocumentOptions): ThemeDocument {
  // Local meta properties - will be initialized after base is created (in onDocumentSynced callback)
  let font: ReturnType<typeof createReactiveMetaProperty<string>>
  let backgroundColor: ReturnType<typeof createReactiveMetaProperty<string>>
  let textColor: ReturnType<typeof createReactiveMetaProperty<string>>
  let isSystemTheme: ReturnType<typeof createReactiveMetaProperty<boolean>>
  let viewport: ReturnType<typeof createReactiveMetaProperty<ViewportArea | undefined>>

  // Background image stored as binary in Yjs
  let backgroundImageMap: ReturnType<typeof import('yjs').Doc.prototype.getMap<unknown>>
  let backgroundImageValue = $state<Uint8Array | null>(null)

  // Base theme properties for inheritance
  let baseFont = $state('')
  let baseBackgroundColor = $state('')
  let baseTextColor = $state('')
  let baseViewport = $state<ViewportArea | undefined>(undefined)

  const base = createBaseDocument({
    ...options,
    onDocumentSynced: () => {
      // Subscribe to meta changes when synced
      font.subscribe()
      backgroundColor.subscribe()
      textColor.subscribe()
      isSystemTheme.subscribe()
      viewport.subscribe()

      // Initialize background image
      const imgData = backgroundImageMap.get('data')
      if (imgData instanceof Uint8Array) {
        backgroundImageValue = imgData
      }

      // Observe background image changes
      backgroundImageMap.observe(() => {
        const imgData = backgroundImageMap.get('data')
        backgroundImageValue = imgData instanceof Uint8Array ? imgData : null
      })

      // Observe base theme meta if present
      if (base.baseMeta) {
        const observeBase = () => {
          baseFont = (base.baseMeta!.get('font') as string) ?? ''
          baseBackgroundColor = (base.baseMeta!.get('backgroundColor') as string) ?? ''
          baseTextColor = (base.baseMeta!.get('textColor') as string) ?? ''
          baseViewport = base.baseMeta!.get('viewport') as ViewportArea | undefined
        }

        // Initial values
        observeBase()

        // Observe base changes
        base.baseMeta.observe(observeBase)
      }
    },
  })

  // Initialize meta properties
  font = createReactiveMetaProperty(base.meta, 'font', '')
  backgroundColor = createReactiveMetaProperty(base.meta, 'backgroundColor', '')
  textColor = createReactiveMetaProperty(base.meta, 'textColor', '')
  isSystemTheme = createReactiveMetaProperty(base.meta, 'isSystemTheme', false)
  viewport = createReactiveMetaProperty<ViewportArea | undefined>(base.meta, 'viewport', undefined)
  backgroundImageMap = base.ydoc.getMap('backgroundImage')

  function assertWritable() {
    if (base.readOnly) {
      throw new Error('Document is readonly')
    }
    if (isSystemTheme.get()) {
      throw new Error('Cannot modify system theme')
    }
  }

  return {
    // State
    get connected() {
      return base.connected
    },
    get synced() {
      return base.synced
    },
    get syncTimedOut() {
      return base.syncTimedOut
    },
    get readOnly() {
      return base.readOnly
    },
    get isSystemTheme() {
      return isSystemTheme.get()
    },

    // Direct meta accessors (local values only)
    get font() {
      return font.get()
    },
    get backgroundColor() {
      return backgroundColor.get()
    },
    get textColor() {
      return textColor.get()
    },
    get viewport() {
      return viewport.get()
    },

    // Meta setters (check readOnly and isSystemTheme)
    setFont(value: string) {
      assertWritable()
      font.set(value)
    },
    setBackgroundColor(value: string) {
      assertWritable()
      backgroundColor.set(value)
    },
    setTextColor(value: string) {
      assertWritable()
      textColor.set(value)
    },
    setViewport(value: ViewportArea | undefined) {
      assertWritable()
      viewport.set(value)
    },

    // Background image
    get backgroundImage() {
      return backgroundImageValue
    },
    setBackgroundImage(data: Uint8Array | null) {
      assertWritable()
      if (data) {
        backgroundImageMap.set('data', data)
      } else {
        backgroundImageMap.delete('data')
      }
    },

    // Effective values (inherit from base if not set locally)
    get effectiveFont() {
      return font.get() || baseFont || 'sans-serif'
    },
    get effectiveBackgroundColor() {
      return backgroundColor.get() || baseBackgroundColor || '#ffffff'
    },
    get effectiveTextColor() {
      return textColor.get() || baseTextColor || '#000000'
    },
    get effectiveViewport() {
      return viewport.get() ?? baseViewport
    },

    // Raw Yjs access
    get ydoc() {
      return base.ydoc
    },
    get meta() {
      return base.meta
    },

    // Lifecycle
    retry() {
      base.retry()
    },
    destroy() {
      base.destroy()
    },
  }
}
