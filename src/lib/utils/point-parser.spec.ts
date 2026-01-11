import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { parseNavigationPoints, clampPointIndex, type NavigationPoint } from './point-parser'

describe('parseNavigationPoints', () => {
  it('returns empty array for null content', () => {
    const result = parseNavigationPoints(null)
    expect(result).toEqual([])
  })

  it('returns default slide when content is empty', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    const result = parseNavigationPoints(content)

    expect(result).toEqual([{ index: 0, label: 'Slide 1', level: 1 }])
  })

  it('extracts headings as navigation points', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    // Add heading elements
    const heading1 = new Y.XmlElement('heading')
    heading1.setAttribute('level', '1')
    const text1 = new Y.XmlText()
    text1.insert(0, 'Introduction')
    heading1.insert(0, [text1])

    const heading2 = new Y.XmlElement('heading')
    heading2.setAttribute('level', '2')
    const text2 = new Y.XmlText()
    text2.insert(0, 'Background')
    heading2.insert(0, [text2])

    content.insert(0, [heading1, heading2])

    const result = parseNavigationPoints(content)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ index: 0, label: 'Introduction', level: 1 })
    expect(result[1]).toEqual({ index: 1, label: 'Background', level: 2 })
  })

  it('handles different heading levels', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    const h1 = new Y.XmlElement('heading')
    h1.setAttribute('level', '1')
    const t1 = new Y.XmlText()
    t1.insert(0, 'H1')
    h1.insert(0, [t1])

    const h2 = new Y.XmlElement('heading')
    h2.setAttribute('level', '2')
    const t2 = new Y.XmlText()
    t2.insert(0, 'H2')
    h2.insert(0, [t2])

    const h3 = new Y.XmlElement('heading')
    h3.setAttribute('level', '3')
    const t3 = new Y.XmlText()
    t3.insert(0, 'H3')
    h3.insert(0, [t3])

    content.insert(0, [h1, h2, h3])

    const result = parseNavigationPoints(content)

    expect(result[0].level).toBe(1)
    expect(result[1].level).toBe(2)
    expect(result[2].level).toBe(3)
  })

  it('skips empty headings', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    const emptyHeading = new Y.XmlElement('heading')
    emptyHeading.setAttribute('level', '1')

    const validHeading = new Y.XmlElement('heading')
    validHeading.setAttribute('level', '1')
    const text = new Y.XmlText()
    text.insert(0, 'Valid')
    validHeading.insert(0, [text])

    content.insert(0, [emptyHeading, validHeading])

    const result = parseNavigationPoints(content)

    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Valid')
  })

  it('trims whitespace from heading labels', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    const heading = new Y.XmlElement('heading')
    heading.setAttribute('level', '1')
    const text = new Y.XmlText()
    text.insert(0, '  Padded Title  ')
    heading.insert(0, [text])

    content.insert(0, [heading])

    const result = parseNavigationPoints(content)

    expect(result[0].label).toBe('Padded Title')
  })

  it('defaults to level 1 when level attribute missing', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    const heading = new Y.XmlElement('heading')
    // No level attribute set
    const text = new Y.XmlText()
    text.insert(0, 'No Level')
    heading.insert(0, [text])

    content.insert(0, [heading])

    const result = parseNavigationPoints(content)

    expect(result[0].level).toBe(1)
  })

  it('ignores non-heading elements', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    const paragraph = new Y.XmlElement('paragraph')
    const pText = new Y.XmlText()
    pText.insert(0, 'This is a paragraph')
    paragraph.insert(0, [pText])

    const heading = new Y.XmlElement('heading')
    heading.setAttribute('level', '1')
    const hText = new Y.XmlText()
    hText.insert(0, 'Heading')
    heading.insert(0, [hText])

    content.insert(0, [paragraph, heading])

    const result = parseNavigationPoints(content)

    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Heading')
  })

  it('assigns sequential indices to navigation points', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    for (let i = 0; i < 5; i++) {
      const heading = new Y.XmlElement('heading')
      heading.setAttribute('level', '1')
      const text = new Y.XmlText()
      text.insert(0, `Slide ${i + 1}`)
      heading.insert(0, [text])
      content.push([heading])
    }

    const result = parseNavigationPoints(content)

    expect(result).toHaveLength(5)
    result.forEach((point, i) => {
      expect(point.index).toBe(i)
    })
  })
})

describe('clampPointIndex', () => {
  it('returns 0 for negative index', () => {
    expect(clampPointIndex(-1, 10)).toBe(0)
    expect(clampPointIndex(-100, 10)).toBe(0)
  })

  it('returns max valid index for index exceeding total', () => {
    expect(clampPointIndex(10, 5)).toBe(4)
    expect(clampPointIndex(100, 10)).toBe(9)
  })

  it('returns same index when within bounds', () => {
    expect(clampPointIndex(3, 10)).toBe(3)
    expect(clampPointIndex(0, 10)).toBe(0)
    expect(clampPointIndex(9, 10)).toBe(9)
  })

  it('returns 0 when totalPoints is 0', () => {
    expect(clampPointIndex(5, 0)).toBe(0)
    expect(clampPointIndex(-1, 0)).toBe(0)
  })

  it('returns 0 for single point', () => {
    expect(clampPointIndex(0, 1)).toBe(0)
    expect(clampPointIndex(5, 1)).toBe(0)
  })
})
