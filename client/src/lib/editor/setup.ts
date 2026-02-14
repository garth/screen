import { keymap } from 'prosemirror-keymap'
import { history, undo, redo } from 'prosemirror-history'
import { baseKeymap, toggleMark, setBlockType, chainCommands, exitCode, lift } from 'prosemirror-commands'
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list'
import { inputRules, wrappingInputRule, textblockTypeInputRule, InputRule } from 'prosemirror-inputrules'
import { dropCursor } from 'prosemirror-dropcursor'
import { gapCursor } from 'prosemirror-gapcursor'
import { Plugin } from 'prosemirror-state'
import type { Schema } from 'prosemirror-model'
import type { EditorView, NodeView } from 'prosemirror-view'
import type { Command } from 'prosemirror-state'
import type { Node as ProsemirrorNode } from 'prosemirror-model'

import { presentationSchema } from './schema'
import { mergeSegments, unmergeSegments } from './merge-commands'

// ============================================================================
// Commands
// ============================================================================

/**
 * Insert a slide divider at the current position
 */
export function insertSlideDivider(schema: Schema): Command {
  return (state, dispatch) => {
    const slideDivider = schema.nodes.slide_divider.create()

    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(slideDivider).scrollIntoView())
    }
    return true
  }
}

/**
 * Insert an image from a data URL
 */
export function insertImage(schema: Schema, src: string, alt?: string): Command {
  return (state, dispatch) => {
    const image = schema.nodes.image.create({ src, alt })

    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(image).scrollIntoView())
    }
    return true
  }
}

/**
 * Toggle blockquote: wrap if not in one, lift (unwrap) if already in one
 */
export function wrapInBlockquote(schema: Schema): Command {
  return (state, dispatch) => {
    const { $from, $to } = state.selection
    const blockquote = schema.nodes.blockquote

    // Check if already inside a blockquote
    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type === blockquote) {
        return lift(state, dispatch)
      }
    }

    // Not in a blockquote — wrap
    const range = $from.blockRange($to)
    if (!range) return false

    if (dispatch) {
      const tr = state.tr.wrap(range, [{ type: blockquote }])
      dispatch(tr.scrollIntoView())
    }
    return true
  }
}

// ============================================================================
// Input Rules
// ============================================================================

/**
 * Create input rules for the presentation schema
 */
function buildInputRules(schema: Schema) {
  const rules: InputRule[] = []

  // Heading rules: # Heading 1, ## Heading 2, ### Heading 3
  rules.push(
    textblockTypeInputRule(/^#\s$/, schema.nodes.heading, { level: 1 }),
    textblockTypeInputRule(/^##\s$/, schema.nodes.heading, { level: 2 }),
    textblockTypeInputRule(/^###\s$/, schema.nodes.heading, { level: 3 }),
  )

  // Bullet list: - item or * item
  rules.push(wrappingInputRule(/^\s*([-*])\s$/, schema.nodes.bullet_list))

  // Ordered list: 1. item
  rules.push(
    wrappingInputRule(
      /^(\d+)\.\s$/,
      schema.nodes.ordered_list,
      (match) => ({ order: +match[1] }),
      (match, node) => node.childCount + node.attrs.order === +match[1],
    ),
  )

  // Blockquote: > quote
  rules.push(wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote))

  // Slide divider: --- or ***
  rules.push(
    new InputRule(/^(---|\*\*\*)\s$/, (state, match, start, end) => {
      const slideDivider = schema.nodes.slide_divider.create()
      return state.tr.replaceWith(start, end, slideDivider)
    }),
  )

  return inputRules({ rules })
}

// ============================================================================
// Keymaps
// ============================================================================

/**
 * Build keymaps for the presentation schema
 */
function buildKeymap(schema: Schema) {
  const keys: Record<string, Command> = {}

  // Bold: Ctrl/Cmd + B
  keys['Mod-b'] = toggleMark(schema.marks.strong)
  keys['Mod-B'] = toggleMark(schema.marks.strong)

  // Italic: Ctrl/Cmd + I
  keys['Mod-i'] = toggleMark(schema.marks.em)
  keys['Mod-I'] = toggleMark(schema.marks.em)

  // Underline: Ctrl/Cmd + U
  keys['Mod-u'] = toggleMark(schema.marks.underline)
  keys['Mod-U'] = toggleMark(schema.marks.underline)

  // Code: Ctrl/Cmd + `
  keys['Mod-`'] = toggleMark(schema.marks.code)

  // Strikethrough: Ctrl/Cmd + Shift + S
  keys['Mod-Shift-s'] = toggleMark(schema.marks.strikethrough)

  // Headings: Ctrl/Cmd + 1/2/3
  keys['Mod-1'] = setBlockType(schema.nodes.heading, { level: 1 })
  keys['Mod-2'] = setBlockType(schema.nodes.heading, { level: 2 })
  keys['Mod-3'] = setBlockType(schema.nodes.heading, { level: 3 })

  // Paragraph: Ctrl/Cmd + 0
  keys['Mod-0'] = setBlockType(schema.nodes.paragraph)

  // Lists
  keys['Mod-Shift-8'] = wrapInList(schema.nodes.bullet_list)
  keys['Mod-Shift-9'] = wrapInList(schema.nodes.ordered_list)

  // List item operations
  keys['Enter'] = splitListItem(schema.nodes.list_item)
  keys['Mod-['] = liftListItem(schema.nodes.list_item)
  keys['Mod-]'] = sinkListItem(schema.nodes.list_item)

  // Blockquote: Ctrl/Cmd + Shift + .
  keys['Mod-Shift-.'] = wrapInBlockquote(schema)

  // Hard break: Shift + Enter
  keys['Shift-Enter'] = chainCommands(exitCode, (state, dispatch) => {
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView())
    }
    return true
  })

  // Undo/Redo
  keys['Mod-z'] = undo
  keys['Mod-y'] = redo
  keys['Mod-Shift-z'] = redo

  // Merge/Unmerge segments: Ctrl/Cmd + M / Ctrl/Cmd + Shift + M
  keys['Mod-m'] = mergeSegments
  keys['Mod-M'] = mergeSegments
  keys['Mod-Shift-m'] = unmergeSegments
  keys['Mod-Shift-M'] = unmergeSegments

  return keymap(keys)
}

// ============================================================================
// Image Upload
// ============================================================================

/**
 * Handle image file and convert to base64 data URL
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Create a plugin to handle image paste and drop
 */
function imageUploadPlugin(_schema: Schema): Plugin {
  return new Plugin({
    props: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              handleImageUpload(view, file)
            }
            return true
          }
        }
        return false
      },

      handleDrop(view, event) {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false

        for (const file of files) {
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            handleImageUpload(view, file)
            return true
          }
        }
        return false
      },
    },
  })
}

async function handleImageUpload(view: EditorView, file: File) {
  try {
    const dataUrl = await fileToDataUrl(file)
    const { state, dispatch } = view
    const image = presentationSchema.nodes.image.create({ src: dataUrl, alt: file.name })
    dispatch(state.tr.replaceSelectionWith(image).scrollIntoView())
  } catch (error) {
    console.error('Failed to upload image:', error)
  }
}

// ============================================================================
// Node Views
// ============================================================================

/**
 * NodeView for slide_divider — renders a visible band with "New Slide" label.
 * Required because <hr> is a void element that can't display background or text.
 */
export function createSlideDividerView(
  _node: ProsemirrorNode,
  _view: EditorView,
  _getPos: () => number | undefined,
): NodeView {
  const dom = document.createElement('div')
  dom.className = 'slide-divider'
  dom.setAttribute('data-slide-divider', 'true')
  dom.contentEditable = 'false'
  dom.textContent = 'New Slide'
  return { dom, stopEvent: () => true }
}

// ============================================================================
// Plugin Setup
// ============================================================================

/**
 * Create all plugins for the presentation editor
 */
export function createEditorPlugins(schema: Schema): Plugin[] {
  return [
    buildInputRules(schema),
    buildKeymap(schema),
    keymap(baseKeymap),
    dropCursor(),
    gapCursor(),
    history(),
    imageUploadPlugin(schema),
  ]
}

export { presentationSchema }
