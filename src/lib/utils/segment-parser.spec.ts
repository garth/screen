import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import {
  parseContentSegments,
  splitIntoSentences,
  createLabel,
  clampSegmentIndex,
  collapseMergedSegments,
  type ContentSegment,
} from './segment-parser'

describe('parseContentSegments', () => {
  let segmentCounter = 0

  function createContent() {
    segmentCounter = 0 // Reset counter for each test
    const ydoc = new Y.Doc()
    return ydoc.getXmlFragment('content')
  }

  function generateSegmentId(): string {
    return `seg-${segmentCounter++}`
  }

  function addParagraph(content: Y.XmlFragment, text: string, withSegmentId = true) {
    const p = new Y.XmlElement('paragraph')
    if (withSegmentId && text.trim()) {
      p.setAttribute('segmentId', generateSegmentId())
    }
    const t = new Y.XmlText()
    t.insert(0, text)
    p.insert(0, [t])
    content.push([p])
    return p
  }

  function addHeading(content: Y.XmlFragment, text: string, level: number, withSegmentId = true) {
    const h = new Y.XmlElement('heading')
    h.setAttribute('level', String(level))
    if (withSegmentId && text.trim()) {
      h.setAttribute('segmentId', generateSegmentId())
    }
    const t = new Y.XmlText()
    t.insert(0, text)
    h.insert(0, [t])
    content.push([h])
    return h
  }

  function addBulletList(content: Y.XmlFragment, items: string[], withSegmentId = true) {
    const ul = new Y.XmlElement('bullet_list')
    for (const itemText of items) {
      const li = new Y.XmlElement('list_item')
      if (withSegmentId) {
        li.setAttribute('segmentId', generateSegmentId())
      }
      const p = new Y.XmlElement('paragraph')
      const t = new Y.XmlText()
      t.insert(0, itemText)
      p.insert(0, [t])
      li.insert(0, [p])
      ul.push([li])
    }
    content.push([ul])
    return ul
  }

  function addImage(content: Y.XmlFragment, alt?: string, withSegmentId = true) {
    const img = new Y.XmlElement('image')
    if (withSegmentId) {
      img.setAttribute('segmentId', generateSegmentId())
    }
    img.setAttribute('src', 'data:image/png;base64,abc')
    if (alt) img.setAttribute('alt', alt)
    content.push([img])
    return img
  }

  function addSlideDivider(content: Y.XmlFragment) {
    const div = new Y.XmlElement('slide_divider')
    content.push([div])
    return div
  }

  function addBlockquote(content: Y.XmlFragment, text: string, withSegmentId = true) {
    const bq = new Y.XmlElement('blockquote')
    if (withSegmentId) {
      bq.setAttribute('segmentId', generateSegmentId())
    }
    const p = new Y.XmlElement('paragraph')
    const t = new Y.XmlText()
    t.insert(0, text)
    p.insert(0, [t])
    bq.insert(0, [p])
    content.push([bq])
    return bq
  }

  describe('basic segmentation', () => {
    it('returns empty array for null content', () => {
      expect(parseContentSegments(null)).toEqual([])
    })

    it('returns fallback segment for empty content', () => {
      const content = createContent()
      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].label).toBe('Slide 1')
      expect(segments[0].type).toBe('paragraph')
    })

    it('creates segment for paragraph', () => {
      const content = createContent()
      addParagraph(content, 'Hello world')

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('paragraph')
      expect(segments[0].label).toBe('Hello world')
    })

    it('creates segment for heading with level', () => {
      const content = createContent()
      addHeading(content, 'My Title', 1)

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('heading')
      expect(segments[0].label).toBe('My Title')
      expect(segments[0].level).toBe(1)
    })

    it('handles different heading levels', () => {
      const content = createContent()
      addHeading(content, 'H1', 1)
      addHeading(content, 'H2', 2)
      addHeading(content, 'H3', 3)

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(3)
      expect(segments[0].level).toBe(1)
      expect(segments[1].level).toBe(2)
      expect(segments[2].level).toBe(3)
    })
  })

  describe('list segmentation', () => {
    it('creates segment for each list item', () => {
      const content = createContent()
      addBulletList(content, ['Item 1', 'Item 2', 'Item 3'])

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(3)
      expect(segments[0].type).toBe('list-item')
      expect(segments[0].label).toBe('Item 1')
      expect(segments[1].label).toBe('Item 2')
      expect(segments[2].label).toBe('Item 3')
    })

    it('creates segments for ordered list items', () => {
      const content = createContent()
      const ol = new Y.XmlElement('ordered_list')
      ol.setAttribute('order', '1')

      for (const text of ['First', 'Second']) {
        const li = new Y.XmlElement('list_item')
        li.setAttribute('segmentId', generateSegmentId())
        const p = new Y.XmlElement('paragraph')
        const t = new Y.XmlText()
        t.insert(0, text)
        p.insert(0, [t])
        li.insert(0, [p])
        ol.push([li])
      }
      content.push([ol])

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(2)
      expect(segments[0].type).toBe('list-item')
      expect(segments[1].type).toBe('list-item')
    })
  })

  describe('image segmentation', () => {
    it('creates segment for image with alt text', () => {
      const content = createContent()
      addImage(content, 'A beautiful sunset')

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('image')
      expect(segments[0].label).toBe('A beautiful sunset')
    })

    it('uses "Image" label when no alt text', () => {
      const content = createContent()
      addImage(content)

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('image')
      expect(segments[0].label).toBe('Image')
    })
  })

  describe('blockquote segmentation', () => {
    it('creates segment for blockquote', () => {
      const content = createContent()
      addBlockquote(content, 'To be or not to be')

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('blockquote')
      expect(segments[0].label).toBe('To be or not to be')
    })
  })

  describe('slide indexing', () => {
    it('increments slideIndex on slide_divider', () => {
      const content = createContent()
      addParagraph(content, 'Slide 1 content')
      addSlideDivider(content)
      addParagraph(content, 'Slide 2 content')
      addSlideDivider(content)
      addParagraph(content, 'Slide 3 content')

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(3)
      expect(segments[0].slideIndex).toBe(0)
      expect(segments[1].slideIndex).toBe(1)
      expect(segments[2].slideIndex).toBe(2)
    })

    it('slide_divider does not create a segment', () => {
      const content = createContent()
      addSlideDivider(content)
      addParagraph(content, 'Content')

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('paragraph')
    })
  })

  describe('sentence handling - stored sentences (backwards compatibility)', () => {
    // Note: The editor no longer creates sentence nodes. These tests verify
    // backwards compatibility with existing documents that have sentence nodes.

    function addParagraphWithSentences(content: Y.XmlFragment, sentences: string[]) {
      const p = new Y.XmlElement('paragraph')
      const parentId = generateSegmentId()
      p.setAttribute('segmentId', parentId)

      for (let i = 0; i < sentences.length; i++) {
        const sentence = new Y.XmlElement('sentence')
        sentence.setAttribute('segmentId', `${parentId}-s${i}`)
        const t = new Y.XmlText()
        t.insert(0, sentences[i])
        sentence.insert(0, [t])
        p.push([sentence])
      }
      content.push([p])
      return p
    }

    it('parses stored sentence nodes within a paragraph', () => {
      const content = createContent()
      addParagraphWithSentences(content, [
        'This is the first sentence.',
        'This is the second sentence.',
        'And here is the third one!',
      ])

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(3)
      expect(segments[0].type).toBe('sentence')
      expect(segments[1].type).toBe('sentence')
      expect(segments[2].type).toBe('sentence')
    })

    it('extracts sentence text for labels and sentenceText field', () => {
      const content = createContent()
      addParagraphWithSentences(content, ['First sentence.', 'Second sentence.'])

      const segments = parseContentSegments(content)

      expect(segments[0].label).toBe('First sentence.')
      expect(segments[0].sentenceText).toBe('First sentence.')
      expect(segments[1].label).toBe('Second sentence.')
      expect(segments[1].sentenceText).toBe('Second sentence.')
    })

    it('paragraph without sentences is a single segment', () => {
      const content = createContent()
      addParagraph(content, 'Short text')

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('paragraph')
    })
  })

  describe('virtual sentence segments', () => {
    // Virtual sentences are created at parse time for long paragraphs
    // without stored sentence nodes

    it('creates virtual sentence segments for long paragraphs with multiple sentences', () => {
      const content = createContent()
      const longText =
        'This is the first sentence with enough words. This is the second sentence that continues. And here is the third!'
      addParagraph(content, longText)

      const segments = parseContentSegments(content)

      // Should have 3 sentence segments
      expect(segments).toHaveLength(3)
      expect(segments[0].type).toBe('sentence')
      expect(segments[1].type).toBe('sentence')
      expect(segments[2].type).toBe('sentence')
    })

    it('assigns virtual IDs with colon separator', () => {
      const content = createContent()
      const longText =
        'First sentence with many words to make it long. Second sentence with more words. Third sentence here!'
      addParagraph(content, longText)

      const segments = parseContentSegments(content)

      // Virtual IDs use colon separator (e.g., seg-xxx:s0)
      expect(segments[0].id).toMatch(/:s0$/)
      expect(segments[1].id).toMatch(/:s1$/)
      expect(segments[2].id).toMatch(/:s2$/)
    })

    it('populates parentSegmentId for virtual sentences', () => {
      const content = createContent()
      // Text must be > 100 chars to trigger virtual sentence creation
      const longText =
        'First sentence with enough content to make it longer. Second sentence continues here with more words. Third sentence ends it all!'
      addParagraph(content, longText)

      const segments = parseContentSegments(content)

      // All virtual sentences should have same parentSegmentId
      const parentId = segments[0].parentSegmentId
      expect(parentId).toBeDefined()
      expect(parentId).toMatch(/^seg-/)
      expect(segments[1].parentSegmentId).toBe(parentId)
      expect(segments[2].parentSegmentId).toBe(parentId)
    })

    it('populates sentenceText with full sentence', () => {
      const content = createContent()
      // Text must be > 100 chars to trigger virtual sentence creation
      const longText =
        'First sentence here with many words to make it long. Second sentence with more content continues. Third one too with extra words!'
      addParagraph(content, longText)

      const segments = parseContentSegments(content)

      expect(segments[0].sentenceText).toBe('First sentence here with many words to make it long.')
      expect(segments[1].sentenceText).toBe('Second sentence with more content continues.')
      expect(segments[2].sentenceText).toBe('Third one too with extra words!')
    })

    it('does not create virtual sentences for short paragraphs', () => {
      const content = createContent()
      addParagraph(content, 'Short text. Another short one.')

      const segments = parseContentSegments(content)

      // Short text - should remain as single paragraph
      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('paragraph')
    })

    it('does not create virtual sentences for long text without sentence breaks', () => {
      const content = createContent()
      addParagraph(content, 'A'.repeat(150)) // Long but no sentences

      const segments = parseContentSegments(content)

      // No sentence breaks - should remain as single paragraph
      expect(segments).toHaveLength(1)
      expect(segments[0].type).toBe('paragraph')
    })

    it('preserves mergeGroupId on virtual sentences', () => {
      const content = createContent()
      const p = new Y.XmlElement('paragraph')
      const parentId = generateSegmentId()
      p.setAttribute('segmentId', parentId)
      p.setAttribute('mergeGroupId', 'merge-test')
      const t = new Y.XmlText()
      // Text must be > 100 chars to trigger virtual sentence creation
      t.insert(
        0,
        'First sentence with content and enough words. Second sentence continues with more content. Third sentence ends it with additional words!',
      )
      p.insert(0, [t])
      content.push([p])

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(3)
      expect(segments[0].mergeGroupId).toBe('merge-test')
      expect(segments[1].mergeGroupId).toBe('merge-test')
      expect(segments[2].mergeGroupId).toBe('merge-test')
    })
  })

  describe('segment IDs and indexing', () => {
    it('reads segment IDs from element attributes', () => {
      const content = createContent()
      addHeading(content, 'Title', 1)
      addParagraph(content, 'Paragraph')
      addImage(content, 'Photo')

      const segments = parseContentSegments(content)

      // IDs are assigned by the helper function (simulating editor behavior)
      expect(segments[0].id).toBe('seg-0')
      expect(segments[1].id).toBe('seg-1')
      expect(segments[2].id).toBe('seg-2')
    })

    it('assigns sequential indices based on document order', () => {
      const content = createContent()
      addHeading(content, 'Title', 1)
      addParagraph(content, 'Paragraph')

      const segments = parseContentSegments(content)

      expect(segments[0].index).toBe(0)
      expect(segments[1].index).toBe(1)
    })

    it('skips elements without segmentId attribute', () => {
      const content = createContent()
      addHeading(content, 'With ID', 1, true)
      addParagraph(content, 'Without ID', false) // No segmentId
      addParagraph(content, 'With ID too', true)

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(2)
      expect(segments[0].label).toBe('With ID')
      expect(segments[1].label).toBe('With ID too')
    })
  })

  describe('mixed content', () => {
    it('handles complex document structure', () => {
      const content = createContent()
      addHeading(content, 'Introduction', 1)
      addParagraph(content, 'Welcome to my presentation.')
      addBulletList(content, ['Point A', 'Point B'])
      addSlideDivider(content)
      addHeading(content, 'Details', 2)
      addImage(content, 'Diagram')
      addBlockquote(content, 'Famous quote')

      const segments = parseContentSegments(content)

      expect(segments.length).toBe(7)

      // First slide (index 0)
      expect(segments[0]).toMatchObject({ type: 'heading', slideIndex: 0 })
      expect(segments[1]).toMatchObject({ type: 'paragraph', slideIndex: 0 })
      expect(segments[2]).toMatchObject({ type: 'list-item', slideIndex: 0 })
      expect(segments[3]).toMatchObject({ type: 'list-item', slideIndex: 0 })

      // Second slide (index 1)
      expect(segments[4]).toMatchObject({ type: 'heading', slideIndex: 1 })
      expect(segments[5]).toMatchObject({ type: 'image', slideIndex: 1 })
      expect(segments[6]).toMatchObject({ type: 'blockquote', slideIndex: 1 })
    })
  })

  describe('edge cases', () => {
    it('elements without segmentId are skipped', () => {
      const content = createContent()
      // Empty elements don't get segment IDs from the helper
      addParagraph(content, '', true) // Empty - no segmentId assigned
      addParagraph(content, '   ', true) // Whitespace only - no segmentId assigned
      addParagraph(content, 'Valid') // Has content - gets segmentId

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].label).toBe('Valid')
    })

    it('empty headings without segmentId are skipped', () => {
      const content = createContent()
      addHeading(content, '', 1) // Empty - no segmentId assigned
      addHeading(content, 'Valid Heading', 2) // Has content - gets segmentId

      const segments = parseContentSegments(content)

      expect(segments).toHaveLength(1)
      expect(segments[0].label).toBe('Valid Heading')
    })

    it('trims whitespace from labels', () => {
      const content = createContent()
      const p = new Y.XmlElement('paragraph')
      p.setAttribute('segmentId', 'seg-test')
      const t = new Y.XmlText()
      t.insert(0, '  Spaced text  ')
      p.insert(0, [t])
      content.push([p])

      const segments = parseContentSegments(content)

      expect(segments[0].label).toBe('Spaced text')
    })
  })
})

describe('splitIntoSentences', () => {
  it('splits on periods', () => {
    const result = splitIntoSentences('First sentence. Second sentence.')
    expect(result).toEqual(['First sentence.', 'Second sentence.'])
  })

  it('splits on exclamation marks', () => {
    const result = splitIntoSentences('Hello! How are you?')
    expect(result).toEqual(['Hello!', 'How are you?'])
  })

  it('splits on question marks', () => {
    const result = splitIntoSentences('What is this? I wonder.')
    expect(result).toEqual(['What is this?', 'I wonder.'])
  })

  it('handles multiple spaces between sentences', () => {
    const result = splitIntoSentences('First.   Second.')
    expect(result).toEqual(['First.', 'Second.'])
  })

  it('preserves common abbreviations', () => {
    const result = splitIntoSentences('Dr. Smith went to the store. He bought milk.')
    expect(result).toEqual(['Dr. Smith went to the store.', 'He bought milk.'])
  })

  it('handles Mr. and Mrs. abbreviations', () => {
    const result = splitIntoSentences('Mr. Jones and Mrs. Smith met. They talked.')
    expect(result).toEqual(['Mr. Jones and Mrs. Smith met.', 'They talked.'])
  })

  it('returns single-element array for text without sentence breaks', () => {
    const result = splitIntoSentences('No sentence ending here')
    expect(result).toEqual(['No sentence ending here'])
  })

  it('filters empty strings', () => {
    const result = splitIntoSentences('Only one.  ')
    expect(result).toEqual(['Only one.'])
  })

  it('splits when no space after punctuation but next starts with uppercase', () => {
    const result = splitIntoSentences('First sentence.Second sentence.')
    expect(result).toEqual(['First sentence.', 'Second sentence.'])
  })

  it('handles mixed spacing patterns', () => {
    const result = splitIntoSentences('Normal space. No space.Uppercase start.')
    expect(result).toEqual(['Normal space.', 'No space.', 'Uppercase start.'])
  })
})

describe('createLabel', () => {
  it('returns short text as-is', () => {
    expect(createLabel('Short text', 'paragraph')).toBe('Short text')
  })

  it('truncates long text with ellipsis', () => {
    const longText = 'A'.repeat(100)
    const label = createLabel(longText, 'paragraph')

    expect(label.length).toBeLessThanOrEqual(50)
    expect(label.endsWith('…')).toBe(true)
  })

  it('normalizes whitespace', () => {
    expect(createLabel('Multiple   spaces\n\ttabs', 'paragraph')).toBe('Multiple spaces tabs')
  })

  it('respects custom maxLength', () => {
    const label = createLabel('This is a longer text', 'paragraph', 10)
    expect(label.length).toBeLessThanOrEqual(10)
  })
})

describe('clampSegmentIndex', () => {
  it('returns 0 for negative index', () => {
    expect(clampSegmentIndex(-1, 10)).toBe(0)
    expect(clampSegmentIndex(-100, 10)).toBe(0)
  })

  it('returns max valid index for index exceeding total', () => {
    expect(clampSegmentIndex(10, 5)).toBe(4)
    expect(clampSegmentIndex(100, 10)).toBe(9)
  })

  it('returns same index when within bounds', () => {
    expect(clampSegmentIndex(3, 10)).toBe(3)
    expect(clampSegmentIndex(0, 10)).toBe(0)
  })

  it('returns 0 when totalSegments is 0', () => {
    expect(clampSegmentIndex(5, 0)).toBe(0)
  })
})

describe('collapseMergedSegments', () => {
  function createSegment(id: string, index: number, label: string, mergeGroupId?: string): ContentSegment {
    return {
      id,
      index,
      label,
      type: 'paragraph',
      slideIndex: 0,
      ...(mergeGroupId ? { mergeGroupId } : {}),
    }
  }

  it('returns empty array for empty input', () => {
    expect(collapseMergedSegments([])).toEqual([])
  })

  it('passes through segments without mergeGroupId unchanged', () => {
    const segments: ContentSegment[] = [createSegment('seg-1', 0, 'First'), createSegment('seg-2', 1, 'Second')]

    const result = collapseMergedSegments(segments)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('seg-1')
    expect(result[1].id).toBe('seg-2')
    expect(result[0].mergedCount).toBeUndefined()
  })

  it('collapses consecutive segments with same mergeGroupId', () => {
    const segments: ContentSegment[] = [
      createSegment('seg-1', 0, 'First', 'merge-1'),
      createSegment('seg-2', 1, 'Second', 'merge-1'),
      createSegment('seg-3', 2, 'Third', 'merge-1'),
    ]

    const result = collapseMergedSegments(segments)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('seg-1')
    expect(result[0].mergedCount).toBe(3)
    expect(result[0].mergedSegmentIds).toEqual(['seg-1', 'seg-2', 'seg-3'])
  })

  it('keeps first segment label for collapsed group', () => {
    const segments: ContentSegment[] = [
      createSegment('seg-1', 0, 'First Label', 'merge-1'),
      createSegment('seg-2', 1, 'Second Label', 'merge-1'),
    ]

    const result = collapseMergedSegments(segments)

    expect(result[0].label).toBe('First Label')
  })

  it('re-indexes collapsed segments', () => {
    const segments: ContentSegment[] = [
      createSegment('seg-1', 0, 'Solo'),
      createSegment('seg-2', 1, 'Merged 1', 'merge-1'),
      createSegment('seg-3', 2, 'Merged 2', 'merge-1'),
      createSegment('seg-4', 3, 'Another Solo'),
    ]

    const result = collapseMergedSegments(segments)

    expect(result).toHaveLength(3)
    expect(result[0].index).toBe(0)
    expect(result[1].index).toBe(1)
    expect(result[2].index).toBe(2)
  })

  it('handles multiple separate merge groups', () => {
    const segments: ContentSegment[] = [
      createSegment('seg-1', 0, 'Group A 1', 'merge-a'),
      createSegment('seg-2', 1, 'Group A 2', 'merge-a'),
      createSegment('seg-3', 2, 'Solo'),
      createSegment('seg-4', 3, 'Group B 1', 'merge-b'),
      createSegment('seg-5', 4, 'Group B 2', 'merge-b'),
    ]

    const result = collapseMergedSegments(segments)

    expect(result).toHaveLength(3)
    expect(result[0].mergedCount).toBe(2)
    expect(result[0].mergedSegmentIds).toEqual(['seg-1', 'seg-2'])
    expect(result[1].mergedCount).toBeUndefined()
    expect(result[2].mergedCount).toBe(2)
    expect(result[2].mergedSegmentIds).toEqual(['seg-4', 'seg-5'])
  })

  it('treats non-consecutive segments with same mergeGroupId as separate groups', () => {
    const segments: ContentSegment[] = [
      createSegment('seg-1', 0, 'Group 1', 'merge-1'),
      createSegment('seg-2', 1, 'Solo'),
      createSegment('seg-3', 2, 'Group 1 again', 'merge-1'), // Same ID but separated
    ]

    const result = collapseMergedSegments(segments)

    // Since they're not consecutive, they become separate entries
    expect(result).toHaveLength(3)
    expect(result[0].mergedCount).toBeUndefined() // Single segment
    expect(result[1].mergedCount).toBeUndefined()
    expect(result[2].mergedCount).toBeUndefined() // Single segment
  })

  it('preserves original segment properties in collapsed result', () => {
    const segments: ContentSegment[] = [
      {
        id: 'seg-1',
        index: 0,
        label: 'Heading',
        type: 'heading',
        level: 1,
        slideIndex: 0,
        mergeGroupId: 'merge-1',
      },
      {
        id: 'seg-2',
        index: 1,
        label: 'Paragraph',
        type: 'paragraph',
        slideIndex: 0,
        mergeGroupId: 'merge-1',
      },
    ]

    const result = collapseMergedSegments(segments)

    expect(result[0].type).toBe('heading')
    expect(result[0].level).toBe(1)
    expect(result[0].slideIndex).toBe(0)
  })
})
