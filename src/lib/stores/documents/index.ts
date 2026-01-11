// Types
export type {
  DocumentType,
  DocumentOptions,
  PresentationDocument,
  ThemeDocument,
  EventDocument,
  ViewportArea,
  EventChannel,
  ChannelPresentationRelation,
} from './types'

// Base document utilities
export { createBaseDocument, createReactiveMetaProperty } from './base.svelte'
export type { BaseDocument, BaseDocumentOptions, ReactiveMetaProperty } from './base.svelte'

// Document factories
export { createPresentationDoc } from './presentation.svelte'
export { createThemeDoc } from './theme.svelte'
export { createEventDoc } from './event.svelte'
