import * as Y from 'yjs'

export interface NavigationPoint {
  index: number
  label: string
  level: number
  type: 'slide' | 'heading'
}

/**
 * Parse navigation points from Y.XmlFragment content.
 * Points are extracted from:
 * - Slide dividers (which mark the start of new slides)
 * - Heading elements (h1, h2, h3) as sub-points within slides
 *
 * The first slide is implicit (content before any divider).
 * Each slide_divider marks the start of a new slide.
 */
export function parseNavigationPoints(content: Y.XmlFragment | null): NavigationPoint[] {
  if (!content) return []

  const points: NavigationPoint[] = []
  let slideCount = 1
  let hasContent = false

  function processFragment(fragment: Y.XmlFragment | Y.XmlElement) {
    fragment.forEach((item) => {
      if (item instanceof Y.XmlElement) {
        const tagName = item.nodeName.toLowerCase()

        // Check for slide dividers - these create slide navigation points
        if (tagName === 'slide_divider') {
          // If we haven't added the first slide yet and there was content, add it
          if (slideCount === 1 && hasContent && !points.some(p => p.type === 'slide' && p.label === 'Slide 1')) {
            points.push({
              index: points.length,
              label: 'Slide 1',
              level: 0,
              type: 'slide',
            })
          }
          slideCount++
          points.push({
            index: points.length,
            label: `Slide ${slideCount}`,
            level: 0,
            type: 'slide',
          })
        }
        // Check for heading elements - these create heading navigation points
        else if (tagName === 'heading') {
          hasContent = true
          const level = parseInt(String(item.getAttribute('level') || '1'), 10)
          const text = extractText(item)
          if (text.trim()) {
            points.push({
              index: points.length,
              label: text.trim(),
              level,
              type: 'heading',
            })
          }
        }
        // Check for content-bearing elements
        else if (tagName === 'paragraph' || tagName === 'bullet_list' || tagName === 'ordered_list' || tagName === 'blockquote' || tagName === 'image') {
          hasContent = true
          // Recurse into child elements for nested headings
          processFragment(item)
        } else {
          // Recurse into child elements
          processFragment(item)
        }
      } else if (item instanceof Y.XmlText) {
        if (item.toString().trim()) {
          hasContent = true
        }
      }
    })
  }

  /**
   * Extract text content from an XmlElement or XmlText
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

  processFragment(content)

  // If no points found at all, create a single "Slide 1" point
  if (points.length === 0) {
    points.push({ index: 0, label: 'Slide 1', level: 0, type: 'slide' })
  }

  return points
}

/**
 * Get the current point index based on the provided target index,
 * clamped to valid bounds.
 */
export function clampPointIndex(index: number, totalPoints: number): number {
  if (totalPoints === 0) return 0
  return Math.max(0, Math.min(index, totalPoints - 1))
}
