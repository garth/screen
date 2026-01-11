import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { parseNavigationPoints, clampPointIndex } from './point-parser'

describe('parseNavigationPoints', () => {
  it('returns empty array for null content', () => {
    const result = parseNavigationPoints(null)
    expect(result).toEqual([])
  })

  it('returns default slide when content is empty', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    const result = parseNavigationPoints(content)

    expect(result).toEqual([{ index: 0, label: 'Slide 1', level: 0, type: 'slide' }])
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
    expect(result[0]).toEqual({ index: 0, label: 'Introduction', level: 1, type: 'heading' })
    expect(result[1]).toEqual({ index: 1, label: 'Background', level: 2, type: 'heading' })
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

  it('includes heading type in navigation points', () => {
    const ydoc = new Y.Doc()
    const content = ydoc.getXmlFragment('content')

    const heading = new Y.XmlElement('heading')
    heading.setAttribute('level', '1')
    const text = new Y.XmlText()
    text.insert(0, 'Test')
    heading.insert(0, [text])

    content.insert(0, [heading])

    const result = parseNavigationPoints(content)

    expect(result[0].type).toBe('heading')
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

  describe('slide dividers', () => {
    it('creates slide navigation points for slide dividers', () => {
      const ydoc = new Y.Doc()
      const content = ydoc.getXmlFragment('content')

      // Content: paragraph, divider, paragraph
      const p1 = new Y.XmlElement('paragraph')
      const t1 = new Y.XmlText()
      t1.insert(0, 'First slide content')
      p1.insert(0, [t1])

      const divider = new Y.XmlElement('slide_divider')

      const p2 = new Y.XmlElement('paragraph')
      const t2 = new Y.XmlText()
      t2.insert(0, 'Second slide content')
      p2.insert(0, [t2])

      content.insert(0, [p1, divider, p2])

      const result = parseNavigationPoints(content)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ index: 0, label: 'Slide 1', level: 0, type: 'slide' })
      expect(result[1]).toEqual({ index: 1, label: 'Slide 2', level: 0, type: 'slide' })
    })

    it('creates multiple slide points for multiple dividers', () => {
      const ydoc = new Y.Doc()
      const content = ydoc.getXmlFragment('content')

      const p1 = new Y.XmlElement('paragraph')
      const t1 = new Y.XmlText()
      t1.insert(0, 'Slide 1')
      p1.insert(0, [t1])

      const div1 = new Y.XmlElement('slide_divider')

      const p2 = new Y.XmlElement('paragraph')
      const t2 = new Y.XmlText()
      t2.insert(0, 'Slide 2')
      p2.insert(0, [t2])

      const div2 = new Y.XmlElement('slide_divider')

      const p3 = new Y.XmlElement('paragraph')
      const t3 = new Y.XmlText()
      t3.insert(0, 'Slide 3')
      p3.insert(0, [t3])

      content.insert(0, [p1, div1, p2, div2, p3])

      const result = parseNavigationPoints(content)

      expect(result).toHaveLength(3)
      expect(result[0].label).toBe('Slide 1')
      expect(result[1].label).toBe('Slide 2')
      expect(result[2].label).toBe('Slide 3')
    })

    it('mixes slide dividers and headings', () => {
      const ydoc = new Y.Doc()
      const content = ydoc.getXmlFragment('content')

      // h1 -> divider -> h2
      const h1 = new Y.XmlElement('heading')
      h1.setAttribute('level', '1')
      const t1 = new Y.XmlText()
      t1.insert(0, 'Introduction')
      h1.insert(0, [t1])

      const divider = new Y.XmlElement('slide_divider')

      const h2 = new Y.XmlElement('heading')
      h2.setAttribute('level', '2')
      const t2 = new Y.XmlText()
      t2.insert(0, 'Details')
      h2.insert(0, [t2])

      content.insert(0, [h1, divider, h2])

      const result = parseNavigationPoints(content)

      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({ index: 0, label: 'Introduction', level: 1, type: 'heading' })
      expect(result[1]).toEqual({ index: 1, label: 'Slide 1', level: 0, type: 'slide' })
      expect(result[2]).toEqual({ index: 2, label: 'Slide 2', level: 0, type: 'slide' })
      expect(result[3]).toEqual({ index: 3, label: 'Details', level: 2, type: 'heading' })
    })

    it('handles divider at start of content', () => {
      const ydoc = new Y.Doc()
      const content = ydoc.getXmlFragment('content')

      const divider = new Y.XmlElement('slide_divider')

      const p = new Y.XmlElement('paragraph')
      const t = new Y.XmlText()
      t.insert(0, 'Content')
      p.insert(0, [t])

      content.insert(0, [divider, p])

      const result = parseNavigationPoints(content)

      // Should only have Slide 2 since there's no content before divider
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Slide 2')
    })

    it('slide dividers have level 0', () => {
      const ydoc = new Y.Doc()
      const content = ydoc.getXmlFragment('content')

      const p = new Y.XmlElement('paragraph')
      const t = new Y.XmlText()
      t.insert(0, 'Content')
      p.insert(0, [t])

      const divider = new Y.XmlElement('slide_divider')

      content.insert(0, [p, divider])

      const result = parseNavigationPoints(content)

      result
        .filter((p) => p.type === 'slide')
        .forEach((point) => {
          expect(point.level).toBe(0)
        })
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
