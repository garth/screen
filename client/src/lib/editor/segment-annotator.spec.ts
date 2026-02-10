import { describe, it, expect } from 'vitest'
import { Node } from 'prosemirror-model'
import { presentationSchema } from './schema'
import {
  generateSegmentId,
  isSegmentNode,
  shouldHaveSegmentId,
  hasSentenceChildren,
  mapNodeTypeToSegmentType,
  extractSegmentsFromDoc,
} from './segment-annotator'

describe('generateSegmentId', () => {
  it('returns a string starting with "seg-"', () => {
    const id = generateSegmentId()
    expect(id).toMatch(/^seg-/)
  })

  it('generates unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSegmentId())
    }
    expect(ids.size).toBe(100)
  })

  it('generates IDs of consistent length', () => {
    const id1 = generateSegmentId()
    const id2 = generateSegmentId()
    // "seg-" (4 chars) + nanoid(8) = 12 chars
    expect(id1.length).toBe(12)
    expect(id2.length).toBe(12)
  })
})

describe('isSegmentNode', () => {
  it('returns true for paragraph nodes', () => {
    const node = presentationSchema.nodes.paragraph.create()
    expect(isSegmentNode(node)).toBe(true)
  })

  it('returns true for heading nodes', () => {
    const node = presentationSchema.nodes.heading.create({ level: 1 })
    expect(isSegmentNode(node)).toBe(true)
  })

  it('returns true for list_item nodes', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const node = presentationSchema.nodes.list_item.create(null, para)
    expect(isSegmentNode(node)).toBe(true)
  })

  it('returns true for image nodes', () => {
    const node = presentationSchema.nodes.image.create({ src: 'test.png' })
    expect(isSegmentNode(node)).toBe(true)
  })

  it('returns true for blockquote nodes', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const node = presentationSchema.nodes.blockquote.create(null, para)
    expect(isSegmentNode(node)).toBe(true)
  })

  it('returns true for sentence nodes (backwards compatibility)', () => {
    const node = presentationSchema.nodes.sentence.create()
    expect(isSegmentNode(node)).toBe(true)
  })

  it('returns false for bullet_list nodes', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const li = presentationSchema.nodes.list_item.create(null, para)
    const node = presentationSchema.nodes.bullet_list.create(null, li)
    expect(isSegmentNode(node)).toBe(false)
  })

  it('returns false for ordered_list nodes', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const li = presentationSchema.nodes.list_item.create(null, para)
    const node = presentationSchema.nodes.ordered_list.create(null, li)
    expect(isSegmentNode(node)).toBe(false)
  })

  it('returns false for text nodes', () => {
    const node = presentationSchema.text('Hello')
    expect(isSegmentNode(node)).toBe(false)
  })

  it('returns false for slide_divider nodes', () => {
    const node = presentationSchema.nodes.slide_divider.create()
    expect(isSegmentNode(node)).toBe(false)
  })
})

describe('shouldHaveSegmentId', () => {
  it('returns true for paragraph nodes', () => {
    const node = presentationSchema.nodes.paragraph.create()
    expect(shouldHaveSegmentId(node)).toBe(true)
  })

  it('returns true for heading nodes', () => {
    const node = presentationSchema.nodes.heading.create({ level: 2 })
    expect(shouldHaveSegmentId(node)).toBe(true)
  })

  it('returns true for list_item nodes', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const node = presentationSchema.nodes.list_item.create(null, para)
    expect(shouldHaveSegmentId(node)).toBe(true)
  })

  it('returns true for image nodes', () => {
    const node = presentationSchema.nodes.image.create({ src: 'img.jpg' })
    expect(shouldHaveSegmentId(node)).toBe(true)
  })

  it('returns true for blockquote nodes', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const node = presentationSchema.nodes.blockquote.create(null, para)
    expect(shouldHaveSegmentId(node)).toBe(true)
  })

  it('returns true for sentence nodes', () => {
    const node = presentationSchema.nodes.sentence.create()
    expect(shouldHaveSegmentId(node)).toBe(true)
  })

  it('returns false for bullet_list nodes', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const li = presentationSchema.nodes.list_item.create(null, para)
    const node = presentationSchema.nodes.bullet_list.create(null, li)
    expect(shouldHaveSegmentId(node)).toBe(false)
  })
})

describe('hasSentenceChildren', () => {
  it('returns false for paragraph without children', () => {
    const node = presentationSchema.nodes.paragraph.create()
    expect(hasSentenceChildren(node)).toBe(false)
  })

  it('returns false for paragraph with only text', () => {
    const text = presentationSchema.text('Hello world')
    const node = presentationSchema.nodes.paragraph.create(null, text)
    expect(hasSentenceChildren(node)).toBe(false)
  })

  it('returns true for paragraph with sentence children', () => {
    const sentence = presentationSchema.nodes.sentence.create(
      { segmentId: 'seg-test' },
      presentationSchema.text('A sentence.'),
    )
    const node = presentationSchema.nodes.paragraph.create(null, sentence)
    expect(hasSentenceChildren(node)).toBe(true)
  })

  it('returns false for non-paragraph nodes', () => {
    const node = presentationSchema.nodes.heading.create({ level: 1 })
    expect(hasSentenceChildren(node)).toBe(false)
  })
})

describe('mapNodeTypeToSegmentType', () => {
  it('maps heading to heading', () => {
    expect(mapNodeTypeToSegmentType('heading')).toBe('heading')
  })

  it('maps paragraph to paragraph', () => {
    expect(mapNodeTypeToSegmentType('paragraph')).toBe('paragraph')
  })

  it('maps list_item to list-item', () => {
    expect(mapNodeTypeToSegmentType('list_item')).toBe('list-item')
  })

  it('maps image to image', () => {
    expect(mapNodeTypeToSegmentType('image')).toBe('image')
  })

  it('maps blockquote to blockquote', () => {
    expect(mapNodeTypeToSegmentType('blockquote')).toBe('blockquote')
  })

  it('maps sentence to sentence', () => {
    expect(mapNodeTypeToSegmentType('sentence')).toBe('sentence')
  })

  it('maps unknown types to paragraph as fallback', () => {
    expect(mapNodeTypeToSegmentType('unknown')).toBe('paragraph')
    expect(mapNodeTypeToSegmentType('custom_node')).toBe('paragraph')
  })
})

describe('extractSegmentsFromDoc', () => {
  function createDoc(...children: Node[]) {
    return presentationSchema.nodes.doc.create(null, children)
  }

  function createParagraph(text: string, segmentId?: string) {
    const textNode = presentationSchema.text(text)
    return presentationSchema.nodes.paragraph.create({ segmentId }, textNode)
  }

  function createHeading(text: string, level: number, segmentId?: string) {
    const textNode = presentationSchema.text(text)
    return presentationSchema.nodes.heading.create({ level, segmentId }, textNode)
  }

  it('returns fallback segment for empty document', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const doc = createDoc(para)
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(1)
    expect(segments[0].id).toBe('seg-default')
    expect(segments[0].label).toBe('Slide 1')
  })

  it('extracts paragraph segments with IDs', () => {
    const doc = createDoc(createParagraph('Hello world', 'seg-001'), createParagraph('Second paragraph', 'seg-002'))
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(2)
    expect(segments[0].id).toBe('seg-001')
    expect(segments[0].type).toBe('paragraph')
    expect(segments[0].label).toBe('Hello world')
    expect(segments[1].id).toBe('seg-002')
  })

  it('extracts heading segments with level', () => {
    const doc = createDoc(createHeading('Title', 1, 'seg-h1'), createHeading('Subtitle', 2, 'seg-h2'))
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(2)
    expect(segments[0].type).toBe('heading')
    expect(segments[0].level).toBe(1)
    expect(segments[1].type).toBe('heading')
    expect(segments[1].level).toBe(2)
  })

  it('skips nodes without segmentId', () => {
    const doc = createDoc(
      createParagraph('Has ID', 'seg-001'),
      createParagraph('No ID'),
      createParagraph('Also has ID', 'seg-002'),
    )
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(2)
    expect(segments[0].label).toBe('Has ID')
    expect(segments[1].label).toBe('Also has ID')
  })

  it('tracks slide index across slide dividers', () => {
    const divider = presentationSchema.nodes.slide_divider.create()
    const doc = createDoc(
      createParagraph('Slide 1 content', 'seg-001'),
      divider,
      createParagraph('Slide 2 content', 'seg-002'),
      presentationSchema.nodes.slide_divider.create(),
      createParagraph('Slide 3 content', 'seg-003'),
    )
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(3)
    expect(segments[0].slideIndex).toBe(0)
    expect(segments[1].slideIndex).toBe(1)
    expect(segments[2].slideIndex).toBe(2)
  })

  it('extracts sentence segments from paragraphs (backwards compatibility)', () => {
    const sentence1 = presentationSchema.nodes.sentence.create(
      { segmentId: 'seg-p1-s0' },
      presentationSchema.text('First sentence.'),
    )
    const sentence2 = presentationSchema.nodes.sentence.create(
      { segmentId: 'seg-p1-s1' },
      presentationSchema.text('Second sentence.'),
    )
    const para = presentationSchema.nodes.paragraph.create({ segmentId: 'seg-p1' }, [sentence1, sentence2])
    const doc = createDoc(para)
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(2)
    expect(segments[0].type).toBe('sentence')
    expect(segments[0].id).toBe('seg-p1-s0')
    expect(segments[1].type).toBe('sentence')
    expect(segments[1].id).toBe('seg-p1-s1')
  })

  it('skips paragraph when it contains sentences', () => {
    const sentence = presentationSchema.nodes.sentence.create(
      { segmentId: 'seg-p1-s0' },
      presentationSchema.text('A sentence.'),
    )
    const para = presentationSchema.nodes.paragraph.create({ segmentId: 'seg-p1' }, sentence)
    const doc = createDoc(para)
    const segments = extractSegmentsFromDoc(doc)

    // Should only have the sentence, not the parent paragraph
    expect(segments).toHaveLength(1)
    expect(segments[0].type).toBe('sentence')
  })

  it('extracts list item segments', () => {
    const para1 = presentationSchema.nodes.paragraph.create(null, presentationSchema.text('Item 1'))
    const para2 = presentationSchema.nodes.paragraph.create(null, presentationSchema.text('Item 2'))
    const li1 = presentationSchema.nodes.list_item.create({ segmentId: 'seg-li1' }, para1)
    const li2 = presentationSchema.nodes.list_item.create({ segmentId: 'seg-li2' }, para2)
    const list = presentationSchema.nodes.bullet_list.create(null, [li1, li2])
    const doc = createDoc(list)
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(2)
    expect(segments[0].type).toBe('list-item')
    expect(segments[0].id).toBe('seg-li1')
    expect(segments[1].type).toBe('list-item')
    expect(segments[1].id).toBe('seg-li2')
  })

  it('extracts image segments', () => {
    const img = presentationSchema.nodes.image.create({
      src: 'photo.jpg',
      alt: 'A photo',
      segmentId: 'seg-img1',
    })
    const para = presentationSchema.nodes.paragraph.create(null, img)
    const doc = createDoc(para)
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(1)
    expect(segments[0].type).toBe('image')
    expect(segments[0].label).toBe('A photo')
  })

  it('uses "Image" label when alt text is missing', () => {
    const img = presentationSchema.nodes.image.create({
      src: 'photo.jpg',
      segmentId: 'seg-img1',
    })
    const para = presentationSchema.nodes.paragraph.create(null, img)
    const doc = createDoc(para)
    const segments = extractSegmentsFromDoc(doc)

    expect(segments[0].label).toBe('Image')
  })

  it('extracts blockquote segments', () => {
    const quotePara = presentationSchema.nodes.paragraph.create(null, presentationSchema.text('Famous quote here'))
    const quote = presentationSchema.nodes.blockquote.create({ segmentId: 'seg-bq1' }, quotePara)
    const doc = createDoc(quote)
    const segments = extractSegmentsFromDoc(doc)

    expect(segments).toHaveLength(1)
    expect(segments[0].type).toBe('blockquote')
    expect(segments[0].label).toBe('Famous quote here')
  })

  it('assigns sequential indices', () => {
    const doc = createDoc(
      createHeading('Title', 1, 'seg-h1'),
      createParagraph('Para 1', 'seg-p1'),
      createParagraph('Para 2', 'seg-p2'),
    )
    const segments = extractSegmentsFromDoc(doc)

    expect(segments[0].index).toBe(0)
    expect(segments[1].index).toBe(1)
    expect(segments[2].index).toBe(2)
  })

  it('truncates long labels', () => {
    const longText = 'A'.repeat(100)
    const doc = createDoc(createParagraph(longText, 'seg-long'))
    const segments = extractSegmentsFromDoc(doc)

    expect(segments[0].label.length).toBeLessThanOrEqual(50)
    expect(segments[0].label.endsWith('…')).toBe(true)
  })
})
