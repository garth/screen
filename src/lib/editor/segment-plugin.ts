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
  /** Track merge group counts from previous state for detecting deletions */
  mergeGroupCounts: Map<string, number>
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
     * Append transaction to assign segment IDs, handle sentence splitting,
     * and dissolve broken merge groups
     */
    appendTransaction(transactions, oldState, newState) {
      // Only process if document changed
      if (!transactions.some((tr) => tr.docChanged)) return null

      let tr = newState.tr
      let modified = false

      // Get previous merge group counts from plugin state
      const oldPluginState = segmentPluginKey.getState(oldState)
      const oldMergeGroupCounts = oldPluginState?.mergeGroupCounts ?? new Map<string, number>()

      // Count current merge groups
      const newMergeGroupCounts = countMergeGroups(newState.doc)

      // Find merge groups that have been reduced (a segment was deleted)
      const groupsToDissolve: string[] = []
      for (const [groupId, oldCount] of oldMergeGroupCounts) {
        const newCount = newMergeGroupCounts.get(groupId) ?? 0
        if (newCount > 0 && newCount < oldCount) {
          // Group was reduced - dissolve it
          groupsToDissolve.push(groupId)
        }
      }

      // Dissolve broken merge groups
      if (groupsToDissolve.length > 0) {
        const nodesToClear: { pos: number; node: Node }[] = []
        newState.doc.descendants((node, pos) => {
          if (node.attrs.mergeGroupId && groupsToDissolve.includes(node.attrs.mergeGroupId)) {
            nodesToClear.push({ pos, node })
          }
        })

        // Clear in reverse order
        for (const { pos, node } of nodesToClear.reverse()) {
          tr = tr.setNodeMarkup(pos, null, {
            ...node.attrs,
            mergeGroupId: null,
          })
          modified = true
        }
      }

      // Collect nodes that need segment IDs or sentence splitting
      const nodesToUpdate: { pos: number; node: Node }[] = []

      // Use the potentially modified doc from tr
      const docToScan = modified ? tr.doc : newState.doc

      docToScan.descendants((node, pos) => {
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
        const mergeGroupCounts = countMergeGroups(state.doc)
        return { segments, decorations, mergeGroupCounts }
      },
      apply(tr, pluginState, _oldState, newState) {
        if (!tr.docChanged) {
          // Map decorations through the transaction
          return {
            segments: pluginState.segments,
            decorations: pluginState.decorations.map(tr.mapping, tr.doc),
            mergeGroupCounts: pluginState.mergeGroupCounts,
          }
        }

        const segments = extractSegmentsFromDoc(newState.doc)
        const decorations = createSegmentDecorations(newState.doc)
        const mergeGroupCounts = countMergeGroups(newState.doc)
        return { segments, decorations, mergeGroupCounts }
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
 * Count how many nodes belong to each merge group
 */
function countMergeGroups(doc: Node): Map<string, number> {
  const counts = new Map<string, number>()

  doc.descendants((node) => {
    if (node.attrs.mergeGroupId) {
      const groupId = node.attrs.mergeGroupId
      counts.set(groupId, (counts.get(groupId) ?? 0) + 1)
    }
  })

  return counts
}

/**
 * Collect merge group positions for determining first/last in group
 */
interface MergeGroupInfo {
  positions: number[]
  nodes: Node[]
}

function collectMergeGroups(doc: Node): Map<string, MergeGroupInfo> {
  const groups = new Map<string, MergeGroupInfo>()

  doc.descendants((node, pos) => {
    if (node.attrs.mergeGroupId) {
      const groupId = node.attrs.mergeGroupId
      if (!groups.has(groupId)) {
        groups.set(groupId, { positions: [], nodes: [] })
      }
      const info = groups.get(groupId)!
      info.positions.push(pos)
      info.nodes.push(node)
    }
  })

  return groups
}

/**
 * Create decorations for segment boundaries and merge groups
 */
function createSegmentDecorations(doc: Node): DecorationSet {
  const decorations: Decoration[] = []

  // Collect merge group info first
  const mergeGroups = collectMergeGroups(doc)

  doc.descendants((node, pos) => {
    // Add decoration to segment nodes
    if (isSegmentNode(node) && node.attrs.segmentId) {
      // Skip paragraphs that contain sentences (they're containers, not segments)
      if (node.type.name === 'paragraph' && hasSentenceChildren(node)) {
        return
      }

      // Build class list
      let className = 'segment-boundary'

      // Add merge group decorations
      if (node.attrs.mergeGroupId) {
        const groupInfo = mergeGroups.get(node.attrs.mergeGroupId)
        if (groupInfo && groupInfo.positions.length > 1) {
          className += ' merged-segment'

          // Check if this is the first or last in the group
          const isFirst = pos === Math.min(...groupInfo.positions)
          const isLast = pos === Math.max(...groupInfo.positions)

          if (isFirst) className += ' merged-segment-start'
          if (isLast) className += ' merged-segment-end'
        }
      }

      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: className,
          'data-segment-type': node.type.name,
          ...(node.attrs.mergeGroupId ? { 'data-merge-group': node.attrs.mergeGroupId } : {}),
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
