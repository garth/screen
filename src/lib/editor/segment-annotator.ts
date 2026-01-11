import { nanoid } from 'nanoid'
import type { Node } from 'prosemirror-model'
import type { ContentSegment } from '$lib/utils/segment-parser'
import { splitIntoSentences, createLabel } from '$lib/utils/segment-parser'

/** Threshold for splitting long text into sentences */
const SENTENCE_SPLIT_THRESHOLD = 100

/**
 * Generate a short stable segment ID using nanoid
 */
export function generateSegmentId(): string {
  return `seg-${nanoid(8)}`
}

/**
 * Node types that should be segments
 */
const SEGMENT_NODE_TYPES = ['paragraph', 'heading', 'list_item', 'image', 'blockquote', 'sentence']

/**
 * Check if a node should be a segment
 */
export function isSegmentNode(node: Node): boolean {
  return SEGMENT_NODE_TYPES.includes(node.type.name)
}

/**
 * Check if a node should receive a segment ID (top-level segments only)
 */
export function shouldHaveSegmentId(node: Node): boolean {
  // Sentence nodes get their IDs from the parent paragraph
  if (node.type.name === 'sentence') return true
  // Other segment types get their own IDs
  return ['paragraph', 'heading', 'list_item', 'image', 'blockquote'].includes(node.type.name)
}

/**
 * Check if a paragraph contains sentence children
 */
export function hasSentenceChildren(node: Node): boolean {
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
 * Check if a paragraph should be split into sentences
 */
export function shouldSplitParagraph(node: Node): boolean {
  if (node.type.name !== 'paragraph') return false
  if (hasSentenceChildren(node)) return false

  const text = node.textContent
  if (text.length <= SENTENCE_SPLIT_THRESHOLD) return false

  const sentences = splitIntoSentences(text)
  return sentences.length > 1
}

/**
 * Map ProseMirror node type to segment type
 */
export function mapNodeTypeToSegmentType(typeName: string): ContentSegment['type'] {
  switch (typeName) {
    case 'heading':
      return 'heading'
    case 'paragraph':
      return 'paragraph'
    case 'list_item':
      return 'list-item'
    case 'image':
      return 'image'
    case 'blockquote':
      return 'blockquote'
    case 'sentence':
      return 'sentence'
    default:
      return 'paragraph'
  }
}

/**
 * Extract text content from a node for creating a label
 */
function getNodeLabel(node: Node): string {
  if (node.type.name === 'image') {
    return node.attrs.alt || 'Image'
  }
  return node.textContent
}

/**
 * Extract segments from a ProseMirror document
 * Reads existing segment IDs from node attributes
 */
export function extractSegmentsFromDoc(doc: Node): ContentSegment[] {
  const segments: ContentSegment[] = []
  let slideIndex = 0

  doc.descendants((node) => {
    // Track slide boundaries
    if (node.type.name === 'slide_divider') {
      slideIndex++
      return
    }

    // Handle sentence nodes within paragraphs
    if (node.type.name === 'sentence' && node.attrs.segmentId) {
      segments.push({
        id: node.attrs.segmentId,
        index: segments.length,
        label: createLabel(node.textContent, 'sentence'),
        type: 'sentence',
        slideIndex,
      })
      return
    }

    // Handle paragraph with sentence children - skip the paragraph itself
    if (node.type.name === 'paragraph' && hasSentenceChildren(node)) {
      // Sentences will be added by the recursion above
      return
    }

    // Handle regular segment nodes
    if (node.attrs.segmentId && isSegmentNode(node)) {
      segments.push({
        id: node.attrs.segmentId,
        index: segments.length,
        label: createLabel(getNodeLabel(node), mapNodeTypeToSegmentType(node.type.name)),
        type: mapNodeTypeToSegmentType(node.type.name),
        level: node.type.name === 'heading' ? node.attrs.level : undefined,
        slideIndex,
      })
    }
  })

  // Fallback: if no segments found, create a default one
  if (segments.length === 0) {
    segments.push({
      id: 'seg-default',
      index: 0,
      label: 'Slide 1',
      type: 'paragraph',
      slideIndex: 0,
    })
  }

  return segments
}
