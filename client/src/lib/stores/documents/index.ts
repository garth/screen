// Types
export type {
  DocumentType,
  DocumentOptions,
  UserInfo,
  PresentationDocument,
  PresentationFormat,
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

// Presenter awareness (persistent Yjs document for presenter state)
export { createPresenterAwarenessDoc } from './presenter-awareness.svelte'
export type {
  PresenterAwarenessDoc,
  PresenterAwarenessDocOptions,
  PresenterState as PersistentPresenterState,
} from './presenter-awareness.svelte'
