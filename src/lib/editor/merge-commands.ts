import type { EditorState, Transaction } from 'prosemirror-state'
import type { Node } from 'prosemirror-model'
import { nanoid } from 'nanoid'
import { isSegmentNode } from './segment-annotator'

/**
 * Information about a segment node in the document
 */
interface SegmentNodeInfo {
  pos: number
  node: Node
  slideIndex: number
}

/**
 * Find all segment nodes within the current selection
 */
function findSegmentNodesInSelection(state: EditorState): SegmentNodeInfo[] {
  const { from, to } = state.selection
  const nodes: SegmentNodeInfo[] = []
  let slideIndex = 0

  state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
    // Track slide boundaries
    if (node.type.name === 'slide_divider') {
      slideIndex++
      return
    }

    // Check if this node overlaps with selection
    const nodeEnd = pos + node.nodeSize
    if (pos >= to || nodeEnd <= from) {
      return
    }

    // Check if this is a segment node (skip paragraphs with sentence children)
    if (isSegmentNode(node) && node.attrs.segmentId) {
      // Skip sentence containers
      if (node.type.name === 'paragraph' && hasSentenceChildrenInNode(node)) {
        return
      }

      nodes.push({ pos, node, slideIndex })
    }
  })

  return nodes
}

/**
 * Check if a paragraph node contains sentence children
 */
function hasSentenceChildrenInNode(node: Node): boolean {
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
 * Find all segment nodes with a given mergeGroupId
 */
function findNodesWithMergeGroupId(state: EditorState, mergeGroupId: string): SegmentNodeInfo[] {
  const nodes: SegmentNodeInfo[] = []
  let slideIndex = 0

  state.doc.descendants((node, pos) => {
    if (node.type.name === 'slide_divider') {
      slideIndex++
      return
    }

    if (node.attrs.mergeGroupId === mergeGroupId) {
      nodes.push({ pos, node, slideIndex })
    }
  })

  return nodes
}

/**
 * Get the mergeGroupId of the segment at the cursor position
 */
function getMergeGroupIdAtCursor(state: EditorState): string | null {
  const { $from } = state.selection

  // Check ancestors for segment nodes
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth)
    if (isSegmentNode(node) && node.attrs.mergeGroupId) {
      return node.attrs.mergeGroupId
    }
  }

  // Check if we're at a direct segment position
  const pos = $from.before($from.depth)
  if (pos >= 0) {
    const node = state.doc.nodeAt(pos)
    if (node && isSegmentNode(node) && node.attrs.mergeGroupId) {
      return node.attrs.mergeGroupId
    }
  }

  return null
}

/**
 * Check if the selection spans multiple segments that can be merged.
 * Requirements:
 * - At least 2 segment nodes selected
 * - All segments must be on the same slide
 * - No slide_divider between them
 */
export function canMergeSegments(state: EditorState): boolean {
  const segmentNodes = findSegmentNodesInSelection(state)

  // Need at least 2 segments
  if (segmentNodes.length < 2) return false

  // All must be on the same slide
  const firstSlide = segmentNodes[0].slideIndex
  return segmentNodes.every((info) => info.slideIndex === firstSlide)
}

/**
 * Check if the cursor is within a merged segment group.
 */
export function canUnmergeSegments(state: EditorState): boolean {
  return getMergeGroupIdAtCursor(state) !== null
}

/**
 * Merge selected segments into a group.
 * Assigns the same mergeGroupId to all selected segment nodes.
 */
export function mergeSegments(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  if (!canMergeSegments(state)) return false

  const segmentNodes = findSegmentNodesInSelection(state)
  const mergeGroupId = `merge-${nanoid(8)}`

  if (dispatch) {
    let tr = state.tr

    // Process in reverse order to avoid position shifts
    for (const { pos, node } of [...segmentNodes].reverse()) {
      tr = tr.setNodeMarkup(pos, null, {
        ...node.attrs,
        mergeGroupId,
      })
    }

    dispatch(tr)
  }

  return true
}

/**
 * Unmerge all segments in the current merge group.
 * Removes mergeGroupId from all segments that share the same group.
 */
export function unmergeSegments(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const mergeGroupId = getMergeGroupIdAtCursor(state)
  if (!mergeGroupId) return false

  if (dispatch) {
    const nodes = findNodesWithMergeGroupId(state, mergeGroupId)
    let tr = state.tr

    // Process in reverse order to avoid position shifts
    for (const { pos, node } of [...nodes].reverse()) {
      tr = tr.setNodeMarkup(pos, null, {
        ...node.attrs,
        mergeGroupId: null,
      })
    }

    dispatch(tr)
  }

  return true
}

/**
 * Toggle merge state - if segments are selected, merge them;
 * if in a merge group, unmerge.
 */
export function toggleMergeSegments(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  if (canMergeSegments(state)) {
    return mergeSegments(state, dispatch)
  }
  if (canUnmergeSegments(state)) {
    return unmergeSegments(state, dispatch)
  }
  return false
}
