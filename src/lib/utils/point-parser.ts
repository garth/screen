import * as Y from 'yjs'

export interface NavigationPoint {
  index: number
  label: string
  level: number
}

/**
 * Parse navigation points from Y.XmlFragment content.
 * Points are extracted from heading elements (h1, h2, h3).
 */
export function parseNavigationPoints(content: Y.XmlFragment | null): NavigationPoint[] {
  if (!content) return []

  const points: NavigationPoint[] = []

  function extractHeadings(fragment: Y.XmlFragment | Y.XmlElement) {
    fragment.forEach((item) => {
      if (item instanceof Y.XmlElement) {
        const tagName = item.nodeName.toLowerCase()

        // Check for heading elements
        if (tagName === 'heading') {
          const level = parseInt(String(item.getAttribute('level') || '1'), 10)
          const text = extractText(item)
          if (text.trim()) {
            points.push({
              index: points.length,
              label: text.trim(),
              level,
            })
          }
        } else {
          // Recurse into child elements
          extractHeadings(item)
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

  extractHeadings(content)

  // If no headings found, create a single "Slide 1" point
  if (points.length === 0) {
    points.push({ index: 0, label: 'Slide 1', level: 1 })
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
