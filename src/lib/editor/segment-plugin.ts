import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { Node, Schema } from 'prosemirror-model'
import { generateSegmentId, isSegmentNode, extractSegmentsFromDoc } from './segment-annotator'
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
 * 2. Adds visual decorations for segment boundaries
 */
export function createSegmentPlugin(schema: Schema): Plugin {
  return new Plugin({
    key: segmentPluginKey,

    /**
     * Append transaction to assign segment IDs and dissolve broken merge groups
     */
    appendTransaction(transactions, oldState, newState) {
      let tr = newState.tr
      let modified = false

      // Check if any nodes need segment IDs (handles both docChanged and initial load)
      let needsSegmentIds = false
      newState.doc.descendants((node) => {
        if (isSegmentNode(node) && !node.attrs.segmentId) {
          needsSegmentIds = true
          return false // Stop iteration
        }
      })

      // Only process merge group dissolution if document actually changed
      const docChanged = transactions.some((t) => t.docChanged)

      if (docChanged) {
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

        // Remove segment IDs from nodes that have become empty
        const emptySegmentNodes: { pos: number; node: Node }[] = []
        newState.doc.descendants((node, pos) => {
          if (
            isSegmentNode(node) &&
            node.attrs.segmentId &&
            node.type.name !== 'image' &&
            !node.textContent.trim()
          ) {
            emptySegmentNodes.push({ pos, node })
          }
        })

        // Clear segment IDs in reverse order
        for (const { pos, node } of emptySegmentNodes.reverse()) {
          tr = tr.setNodeMarkup(pos, null, {
            ...node.attrs,
            segmentId: null,
            mergeGroupId: null,
          })
          modified = true
        }
      }

      // Skip segment ID assignment if no nodes need it
      if (!needsSegmentIds) {
        return modified ? tr : null
      }

      // Collect nodes that need segment IDs
      const nodesToUpdate: { pos: number; node: Node }[] = []

      // Use the potentially modified doc from tr
      const docToScan = modified ? tr.doc : newState.doc

      docToScan.descendants((node, pos) => {
        // Skip sentence nodes - they're handled by backwards compatibility only
        if (node.type.name === 'sentence') {
          if (!node.attrs.segmentId) {
            nodesToUpdate.push({ pos, node })
          }
          return
        }

        if (isSegmentNode(node) && !node.attrs.segmentId) {
          // Skip empty nodes (except images which have no text content)
          if (node.type.name !== 'image' && !node.textContent.trim()) {
            return
          }

          // Skip paragraphs inside list items - the list_item is the segment
          if (node.type.name === 'paragraph') {
            const $pos = docToScan.resolve(pos)
            for (let d = $pos.depth; d > 0; d--) {
              if ($pos.node(d).type.name === 'list_item') {
                return // Skip this paragraph
              }
            }
          }

          nodesToUpdate.push({ pos, node })
        }
      })

      // Process nodes in reverse order to avoid position shifts
      for (const { pos } of nodesToUpdate.reverse()) {
        // Re-resolve node from current tr.doc in case previous iterations modified it
        const $pos = tr.doc.resolve(pos)
        // Handle edge case: if position no longer valid or node type changed, skip
        if ($pos.pos !== pos || $pos.nodeAfter === null) continue
        const node = $pos.nodeAfter

        if (!node.attrs.segmentId) {
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
 * Check if a paragraph contains sentence children (for backwards compatibility)
 */
function hasSentenceChildren(node: Node): boolean {
  if (node.type.name !== 'paragraph') return false
  let hasSentence = false
  node.forEach((child) => {
    if (child.type.name === 'sentence') {
      hasSentence = true
    }
  })
  return hasSentence
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
      // This is for backwards compatibility with existing documents
      if (node.type.name === 'paragraph' && hasSentenceChildren(node)) {
        return
      }

      // Skip paragraphs inside list items - the list_item gets the decoration
      if (node.type.name === 'paragraph') {
        const $pos = doc.resolve(pos)
        for (let d = $pos.depth; d > 0; d--) {
          if ($pos.node(d).type.name === 'list_item') {
            return // Skip this paragraph
          }
        }
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
export function getSegments(state: { readonly plugins: readonly Plugin[] }): ContentSegment[] {
  const pluginState = segmentPluginKey.getState(state as never)
  return pluginState?.segments ?? []
}
