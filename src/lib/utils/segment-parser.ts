import * as Y from 'yjs'

/**
 * Represents a content segment for presentation navigation.
 * Each segment can be individually highlighted and navigated to.
 */
export interface ContentSegment {
  /** Unique ID for DOM targeting (e.g., "seg-0", "seg-1") */
  id: string
  /** Sequential index in the segments array */
  index: number
  /** Display label (truncated text preview) */
  label: string
  /** Type of content this segment represents */
  type: 'heading' | 'paragraph' | 'list-item' | 'image' | 'blockquote' | 'sentence'
  /** Heading level (1-3) for heading segments */
  level?: number
  /** Which slide this segment belongs to (0-indexed) */
  slideIndex: number
}

/** Threshold for splitting long text into sentences */
const SENTENCE_SPLIT_THRESHOLD = 100

/** Maximum label length for display */
const MAX_LABEL_LENGTH = 50

/** Node types that should be segments */
const SEGMENT_NODE_TYPES = ['paragraph', 'heading', 'list_item', 'image', 'blockquote', 'sentence']

/**
 * Check if an XmlElement is a segment node
 */
function isSegmentNode(element: Y.XmlElement): boolean {
  return SEGMENT_NODE_TYPES.includes(element.nodeName.toLowerCase())
}

/**
 * Check if an element has sentence children
 */
function hasSentenceChildren(element: Y.XmlElement): boolean {
  let hasSentence = false
  element.forEach((child) => {
    if (child instanceof Y.XmlElement && child.nodeName.toLowerCase() === 'sentence') {
      hasSentence = true
    }
  })
  return hasSentence
}

/**
 * Map XmlElement node name to segment type
 */
function mapNodeTypeToSegmentType(nodeName: string): ContentSegment['type'] {
  switch (nodeName.toLowerCase()) {
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
 * Parse content into navigable segments by reading stored segment IDs.
 * Segments are extracted from nodes that have segmentId attributes.
 * This reads the structure created by the editor's segment plugin.
 */
export function parseContentSegments(content: Y.XmlFragment | null): ContentSegment[] {
  if (!content) return []

  const segments: ContentSegment[] = []
  let slideIndex = 0

  function processElement(element: Y.XmlElement) {
    const tagName = element.nodeName.toLowerCase()

    // Track slide boundaries
    if (tagName === 'slide_divider') {
      slideIndex++
      return
    }

    // Handle sentence nodes within paragraphs
    if (tagName === 'sentence') {
      const segmentId = element.getAttribute('segmentId')
      if (segmentId) {
        const text = extractText(element)
        segments.push({
          id: String(segmentId),
          index: segments.length,
          label: createLabel(text, 'sentence'),
          type: 'sentence',
          slideIndex,
        })
      }
      return
    }

    // Handle paragraph with sentence children - skip the paragraph itself
    if (tagName === 'paragraph' && hasSentenceChildren(element)) {
      // Recurse to process sentence children
      element.forEach((child) => {
        if (child instanceof Y.XmlElement) {
          processElement(child)
        }
      })
      return
    }

    // Handle regular segment nodes with segmentId
    const segmentId = element.getAttribute('segmentId')
    if (segmentId && isSegmentNode(element)) {
      const type = mapNodeTypeToSegmentType(tagName)
      const text = tagName === 'image'
        ? String(element.getAttribute('alt') || 'Image')
        : extractText(element)
      const level = tagName === 'heading'
        ? parseInt(String(element.getAttribute('level') || '1'), 10)
        : undefined

      segments.push({
        id: String(segmentId),
        index: segments.length,
        label: createLabel(text, type),
        type,
        level,
        slideIndex,
      })
      return
    }

    // Recurse into lists and other container elements
    if (tagName === 'bullet_list' || tagName === 'ordered_list') {
      element.forEach((child) => {
        if (child instanceof Y.XmlElement) {
          processElement(child)
        }
      })
      return
    }

    // For unknown elements with no segmentId, try to recurse into children
    element.forEach((child) => {
      if (child instanceof Y.XmlElement) {
        processElement(child)
      }
    })
  }

  // Process all top-level elements
  content.forEach((item) => {
    if (item instanceof Y.XmlElement) {
      processElement(item)
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

/**
 * Extract plain text content from an XmlElement or XmlText.
 */
function extractText(element: Y.XmlElement | Y.XmlText): string {
  if (element instanceof Y.XmlText) {
    return element.toString()
  }

  let text = ''
  element.forEach((item) => {
    if (item instanceof Y.XmlText) {
      text += item.toString()
    } else if (item instanceof Y.XmlElement) {
      text += extractText(item)
    }
  })
  return text
}

/**
 * Split text into sentences.
 * Handles common sentence-ending punctuation (.!?) followed by space or end of string.
 */
export function splitIntoSentences(text: string): string[] {
  // Common abbreviations to avoid splitting on
  const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'vs', 'etc', 'e.g', 'i.e']

  // Replace abbreviation periods with placeholder
  let processed = text
  for (const abbr of abbreviations) {
    const regex = new RegExp(`\\b${abbr}\\.`, 'gi')
    processed = processed.replace(regex, `${abbr}<<<DOT>>>`)
  }

  // Split on sentence boundaries
  const parts = processed.split(/(?<=[.!?])\s+/)

  // Restore abbreviation periods and filter empty
  return parts
    .map(s => s.replace(/<<<DOT>>>/g, '.').trim())
    .filter(s => s.length > 0)
}

/**
 * Create a display label for a segment.
 * Truncates long text and adds type-specific formatting.
 */
export function createLabel(text: string, type: ContentSegment['type'], maxLength = MAX_LABEL_LENGTH): string {
  // Clean up whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim()

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  // Truncate and add ellipsis
  return cleaned.slice(0, maxLength - 1).trim() + '…'
}

/**
 * Clamp a segment index to valid bounds.
 */
export function clampSegmentIndex(index: number, totalSegments: number): number {
  if (totalSegments === 0) return 0
  return Math.max(0, Math.min(index, totalSegments - 1))
}
