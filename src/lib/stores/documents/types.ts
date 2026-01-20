import type * as Y from 'yjs'
import type { PresentationAwareness } from './awareness.svelte'

// =============================================================================
// Base Types
// =============================================================================

export type DocumentType = 'presentation' | 'theme' | 'event'

export interface UserInfo {
  id: string
  name: string
  color?: string
}

export interface DocumentOptions {
  documentId: string
  baseDocumentId?: string
  user?: UserInfo
  onMetaChange?: (meta: Record<string, unknown>) => void | Promise<void>
}

// =============================================================================
// Presentation Types
// =============================================================================

export type PresentationFormat = 'single' | 'minimal' | 'block' | 'maximal' | 'scrolling'

export interface PresentationMeta {
  title: string
  themeId: string | null
  format?: PresentationFormat
  font?: string
  backgroundColor?: string
  textColor?: string
}

export interface PresentationDocument {
  readonly connected: boolean
  readonly synced: boolean
  readonly readOnly: boolean

  readonly title: string
  readonly themeId: string | null
  readonly format: PresentationFormat

  setTitle(value: string): void
  setThemeId(value: string | null): void
  setFormat(value: PresentationFormat): void

  readonly font: string | undefined
  readonly backgroundColor: string | undefined
  readonly textColor: string | undefined
  setFont(value: string | undefined): void
  setBackgroundColor(value: string | undefined): void
  setTextColor(value: string | undefined): void

  readonly content: Y.XmlFragment

  readonly ydoc: Y.Doc
  readonly meta: Y.Map<unknown>
  readonly provider: import('@hocuspocus/provider').HocuspocusProvider
  readonly awareness: PresentationAwareness

  destroy(): void
}

// =============================================================================
// Theme Types
// =============================================================================

export interface ViewportArea {
  x: number
  y: number
  width: number
  height: number
}

export interface ThemeMeta {
  font: string
  backgroundColor: string
  textColor: string
  isSystemTheme: boolean
  viewport?: ViewportArea
}

export interface ThemeDocument {
  readonly connected: boolean
  readonly synced: boolean
  readonly readOnly: boolean
  readonly isSystemTheme: boolean

  readonly font: string
  readonly backgroundColor: string
  readonly textColor: string
  readonly viewport: ViewportArea | undefined

  setFont(value: string): void
  setBackgroundColor(value: string): void
  setTextColor(value: string): void
  setViewport(value: ViewportArea | undefined): void

  readonly backgroundImage: Uint8Array | null
  setBackgroundImage(data: Uint8Array | null): void

  readonly effectiveFont: string
  readonly effectiveBackgroundColor: string
  readonly effectiveTextColor: string
  readonly effectiveViewport: ViewportArea | undefined

  readonly ydoc: Y.Doc
  readonly meta: Y.Map<unknown>

  destroy(): void
}

// =============================================================================
// Event Types
// =============================================================================

export interface ChannelPresentationRelation {
  presentationId: string
  themeOverrideId?: string
  order: number
}

export interface EventChannel {
  id: string
  name: string
  order: number
  presentations: ChannelPresentationRelation[]
}

export interface EventDocument {
  readonly connected: boolean
  readonly synced: boolean
  readonly readOnly: boolean

  readonly presentations: string[]
  addPresentation(presentationId: string): void
  removePresentation(presentationId: string): void
  reorderPresentation(presentationId: string, newIndex: number): void

  readonly channels: EventChannel[]
  addChannel(name: string): string
  removeChannel(channelId: string): void
  updateChannel(channelId: string, updates: Partial<Pick<EventChannel, 'name' | 'order'>>): void
  reorderChannel(channelId: string, newIndex: number): void

  assignPresentationToChannel(channelId: string, presentationId: string, themeOverrideId?: string): void
  removePresentationFromChannel(channelId: string, presentationId: string): void
  setChannelPresentationTheme(channelId: string, presentationId: string, themeOverrideId: string | undefined): void
  reorderChannelPresentation(channelId: string, presentationId: string, newIndex: number): void

  readonly ydoc: Y.Doc
  readonly meta: Y.Map<unknown>

  destroy(): void
}
