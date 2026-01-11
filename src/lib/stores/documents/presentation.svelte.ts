import { createBaseDocument, createReactiveMetaProperty } from './base.svelte'
import type { DocumentOptions, PresentationDocument } from './types'

export function createPresentationDoc(options: DocumentOptions): PresentationDocument {
  // Meta properties with reactive bindings
  let title: ReturnType<typeof createReactiveMetaProperty<string>>
  let themeId: ReturnType<typeof createReactiveMetaProperty<string | null>>
  let font: ReturnType<typeof createReactiveMetaProperty<string | undefined>>
  let backgroundColor: ReturnType<typeof createReactiveMetaProperty<string | undefined>>
  let textColor: ReturnType<typeof createReactiveMetaProperty<string | undefined>>

  const base = createBaseDocument({
    ...options,
    onDocumentSynced: () => {
      // Subscribe to meta changes when synced
      title.subscribe()
      themeId.subscribe()
      font.subscribe()
      backgroundColor.subscribe()
      textColor.subscribe()
    },
  })

  // Initialize meta properties
  title = createReactiveMetaProperty(base.meta, 'title', '')
  themeId = createReactiveMetaProperty<string | null>(base.meta, 'themeId', null)
  font = createReactiveMetaProperty<string | undefined>(base.meta, 'font', undefined)
  backgroundColor = createReactiveMetaProperty<string | undefined>(
    base.meta,
    'backgroundColor',
    undefined,
  )
  textColor = createReactiveMetaProperty<string | undefined>(base.meta, 'textColor', undefined)

  // Rich text content
  const content = base.ydoc.getText('content')

  function assertWritable() {
    if (base.readOnly) {
      throw new Error('Document is readonly')
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
    get readOnly() {
      return base.readOnly
    },

    // Meta accessors
    get title() {
      return title.get()
    },
    get themeId() {
      return themeId.get()
    },

    // Meta setters
    setTitle(value: string) {
      assertWritable()
      title.set(value)
    },
    setThemeId(value: string | null) {
      assertWritable()
      themeId.set(value)
    },

    // Theme overrides
    get font() {
      return font.get()
    },
    get backgroundColor() {
      return backgroundColor.get()
    },
    get textColor() {
      return textColor.get()
    },

    setFont(value: string | undefined) {
      assertWritable()
      font.set(value)
    },
    setBackgroundColor(value: string | undefined) {
      assertWritable()
      backgroundColor.set(value)
    },
    setTextColor(value: string | undefined) {
      assertWritable()
      textColor.set(value)
    },

    // Rich text content
    get content() {
      return content
    },

    // Raw Yjs access
    get ydoc() {
      return base.ydoc
    },
    get meta() {
      return base.meta
    },

    // Lifecycle
    destroy() {
      base.destroy()
    },
  }
}
