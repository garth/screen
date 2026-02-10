import { createBaseDocument, createReactiveMetaProperty } from './base.svelte'
import { createPresentationAwareness } from './awareness.svelte'
import type { DocumentOptions, PresentationDocument, PresentationFormat } from './types'

export function createPresentationDoc(options: DocumentOptions): PresentationDocument {
  // Meta properties with reactive bindings (assigned in onDocumentSynced callback)
  let title: ReturnType<typeof createReactiveMetaProperty<string>>
  let themeId: ReturnType<typeof createReactiveMetaProperty<string | null>>
  let format: ReturnType<typeof createReactiveMetaProperty<PresentationFormat | undefined>>
  let font: ReturnType<typeof createReactiveMetaProperty<string | undefined>>
  let backgroundColor: ReturnType<typeof createReactiveMetaProperty<string | undefined>>
  let textColor: ReturnType<typeof createReactiveMetaProperty<string | undefined>>

  // Reactive content version - increments when Yjs content changes
  let contentVersion = $state(0)

  const base = createBaseDocument({
    ...options,
    onDocumentSynced: () => {
      // Subscribe to meta changes when synced
      title.subscribe()
      themeId.subscribe()
      format.subscribe()
      font.subscribe()
      backgroundColor.subscribe()
      textColor.subscribe()
    },
  })

  // Initialize meta properties
  title = createReactiveMetaProperty(base.meta, 'title', '')
  themeId = createReactiveMetaProperty<string | null>(base.meta, 'themeId', null)
  format = createReactiveMetaProperty<PresentationFormat | undefined>(base.meta, 'format', undefined)
  font = createReactiveMetaProperty<string | undefined>(base.meta, 'font', undefined)
  backgroundColor = createReactiveMetaProperty<string | undefined>(base.meta, 'backgroundColor', undefined)
  textColor = createReactiveMetaProperty<string | undefined>(base.meta, 'textColor', undefined)

  // Rich text content (XmlFragment for ProseMirror compatibility)
  const content = base.ydoc.getXmlFragment('content')

  // Observe content changes to trigger reactive updates
  const contentObserver = () => {
    contentVersion++
  }
  content.observeDeep(contentObserver)

  // Shared awareness channel for presenter sync via Phoenix Channel
  const awareness = createPresentationAwareness(base.provider)

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
    get format(): PresentationFormat {
      return format.get() ?? 'scrolling'
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
    setFormat(value: PresentationFormat) {
      assertWritable()
      format.set(value)
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
    // Version number that increments on each content change (for reactive updates)
    get contentVersion() {
      return contentVersion
    },

    // Raw Yjs access
    get ydoc() {
      return base.ydoc
    },
    get meta() {
      return base.meta
    },
    get provider() {
      return base.provider
    },
    get awareness() {
      return awareness
    },

    // Lifecycle
    destroy() {
      content.unobserveDeep(contentObserver)
      base.destroy()
    },
  }
}
