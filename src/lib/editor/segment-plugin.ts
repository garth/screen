import { Plugin, PluginKey, Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { Node, Schema } from 'prosemirror-model'
import {
  generateSegmentId,
  isSegmentNode,
  hasSentenceChildren,
  shouldSplitParagraph,
  extractSegmentsFromDoc,
} from './segment-annotator'
import { splitIntoSentences } from '$lib/utils/segment-parser'
import type { ContentSegment } from '$lib/utils/segment-parser'

export const segmentPluginKey = new PluginKey<SegmentPluginState>('segments')

interface SegmentPluginState {
  segments: ContentSegment[]
  decorations: DecorationSet
}

/**
 * Create the segment plugin for ProseMirror
 * This plugin:
 * 1. Assigns segment IDs to new nodes
 * 2. Splits long paragraphs into sentence nodes
 * 3. Adds visual decorations for segment boundaries
 */
export function createSegmentPlugin(schema: Schema): Plugin {
  return new Plugin({
    key: segmentPluginKey,

    /**
     * Append transaction to assign segment IDs and handle sentence splitting
     */
    appendTransaction(transactions, oldState, newState) {
      // Only process if document changed
      if (!transactions.some((tr) => tr.docChanged)) return null

      let tr = newState.tr
      let modified = false

      // Collect nodes that need segment IDs or sentence splitting
      const nodesToUpdate: { pos: number; node: Node }[] = []

      newState.doc.descendants((node, pos) => {
        // Skip nodes that already have IDs and don't need splitting
        if (node.type.name === 'sentence') {
          if (!node.attrs.segmentId) {
            nodesToUpdate.push({ pos, node })
          }
          return
        }

        if (isSegmentNode(node) && !node.attrs.segmentId) {
          nodesToUpdate.push({ pos, node })
        }

        // Check if paragraph needs sentence splitting
        if (shouldSplitParagraph(node)) {
          nodesToUpdate.push({ pos, node })
        }
      })

      // Process nodes in reverse order to avoid position shifts
      for (const { pos, node } of nodesToUpdate.reverse()) {
        if (shouldSplitParagraph(node)) {
          // Convert paragraph to contain sentence nodes
          tr = splitParagraphToSentences(tr, pos, node, schema)
          modified = true
        } else if (!node.attrs.segmentId) {
          // Assign segment ID
          tr = tr.setNodeMarkup(pos, null, {
            ...node.attrs,
            segmentId: generateSegmentId(),
          })
          modified = true
        }
      }

      return modified ? tr : null
    },

    state: {
      init(_, state) {
        const segments = extractSegmentsFromDoc(state.doc)
        const decorations = createSegmentDecorations(state.doc)
        return { segments, decorations }
      },
      apply(tr, pluginState, _oldState, newState) {
        if (!tr.docChanged) {
          // Map decorations through the transaction
          return {
            segments: pluginState.segments,
            decorations: pluginState.decorations.map(tr.mapping, tr.doc),
          }
        }

        const segments = extractSegmentsFromDoc(newState.doc)
        const decorations = createSegmentDecorations(newState.doc)
        return { segments, decorations }
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)?.decorations
      },
    },
  })
}

/**
 * Split a paragraph into sentence nodes
 */
function splitParagraphToSentences(tr: Transaction, pos: number, node: Node, schema: Schema): Transaction {
  const text = node.textContent
  const sentences = splitIntoSentences(text)

  if (sentences.length <= 1) return tr

  // Generate parent segment ID if not present
  const parentSegmentId = node.attrs.segmentId || generateSegmentId()

  // Create sentence nodes
  const sentenceNodes = sentences.map((sentenceText, index) => {
    return schema.nodes.sentence.create({ segmentId: `${parentSegmentId}-s${index}` }, schema.text(sentenceText))
  })

  // Replace paragraph content with sentence nodes
  // The paragraph keeps its segmentId, sentences get derived IDs
  const newParagraph = schema.nodes.paragraph.create({ segmentId: parentSegmentId }, sentenceNodes)

  // Replace the old paragraph with the new one
  return tr.replaceWith(pos, pos + node.nodeSize, newParagraph)
}

/**
 * Create decorations for segment boundaries
 */
function createSegmentDecorations(doc: Node): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    // Add decoration to segment nodes
    if (isSegmentNode(node) && node.attrs.segmentId) {
      // Skip paragraphs that contain sentences (they're containers, not segments)
      if (node.type.name === 'paragraph' && hasSentenceChildren(node)) {
        return
      }

      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: 'segment-boundary',
          'data-segment-type': node.type.name,
        }),
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

/**
 * Get the current segments from the editor state
 */
export function getSegments(state: { plugins: Plugin[] }): ContentSegment[] {
  const pluginState = segmentPluginKey.getState(state as never)
  return pluginState?.segments ?? []
}
