import { page } from 'vitest/browser'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import * as Y from 'yjs'
import PresentationViewer from './PresentationViewer.svelte'
import { defaultTheme } from '$lib/utils/theme-resolver'
import type { ContentSegment } from '$lib/utils/segment-parser'

describe('PresentationViewer', () => {
  let segmentCounter = 0

  function createContent() {
    segmentCounter = 0
    const ydoc = new Y.Doc()
    return ydoc.getXmlFragment('content')
  }

  function generateSegmentId(): string {
    return `seg-${segmentCounter++}`
  }

  function addParagraph(content: Y.XmlFragment, text: string): string {
    const p = new Y.XmlElement('paragraph')
    const segmentId = generateSegmentId()
    p.setAttribute('segmentId', segmentId)
    const t = new Y.XmlText()
    t.insert(0, text)
    p.insert(0, [t])
    content.push([p])
    return segmentId
  }

  function createSegments(ids: string[]): ContentSegment[] {
    return ids.map((id, index) => ({
      id,
      index,
      label: `Segment ${index}`,
      type: 'paragraph' as const,
      slideIndex: 0,
    }))
  }

  function addEmptyParagraph(content: Y.XmlFragment) {
    const p = new Y.XmlElement('paragraph')
    // No segmentId - empty paragraphs don't get segment IDs
    const t = new Y.XmlText()
    t.insert(0, '')
    p.insert(0, [t])
    content.push([p])
  }

  // Empty paragraph with no text child at all (how ProseMirror might create it)
  function addEmptyParagraphNoChild(content: Y.XmlFragment) {
    const p = new Y.XmlElement('paragraph')
    // No segmentId, no children
    content.push([p])
  }

  // Empty paragraph with explicit null segmentId (how segment plugin clears it)
  function addEmptyParagraphWithNullSegmentId(content: Y.XmlFragment) {
    const p = new Y.XmlElement('paragraph')
    p.setAttribute('segmentId', null as unknown as string)
    const t = new Y.XmlText()
    t.insert(0, '')
    p.insert(0, [t])
    content.push([p])
  }

  function addSlideDivider(content: Y.XmlFragment) {
    const divider = new Y.XmlElement('slide_divider')
    content.push([divider])
  }

  function addHeading(content: Y.XmlFragment, text: string, level = 1): string {
    const h = new Y.XmlElement('heading')
    const segmentId = generateSegmentId()
    h.setAttribute('segmentId', segmentId)
    h.setAttribute('level', level)
    const t = new Y.XmlText()
    t.insert(0, text)
    h.insert(0, [t])
    content.push([h])
    return segmentId
  }

  /**
   * Adds a long paragraph that will be split into sentence segments.
   * Returns the segment ID of the paragraph (which becomes the parentSegmentId for sentences).
   */
  function addLongParagraph(content: Y.XmlFragment, text: string): string {
    const p = new Y.XmlElement('paragraph')
    const segmentId = generateSegmentId()
    p.setAttribute('segmentId', segmentId)
    const t = new Y.XmlText()
    t.insert(0, text)
    p.insert(0, [t])
    content.push([p])
    return segmentId
  }

  /**
   * Creates sentence segments from a parent paragraph.
   * Sentence segments have virtual IDs like "{parentId}:s0", "{parentId}:s1"
   */
  function createSentenceSegments(
    parentId: string,
    sentences: string[],
    startIndex: number,
    slideIndex = 0,
  ): ContentSegment[] {
    return sentences.map((text, i) => ({
      id: `${parentId}:s${i}`,
      index: startIndex + i,
      label: text.length > 50 ? text.slice(0, 50) + '...' : text,
      type: 'sentence' as const,
      slideIndex,
      parentSegmentId: parentId,
      sentenceText: text,
    }))
  }

  function addOrderedList(content: Y.XmlFragment, items: string[], startOrder = 1): string[] {
    const ol = new Y.XmlElement('ordered_list')
    if (startOrder !== 1) {
      ol.setAttribute('order', startOrder)
    }
    const ids: string[] = []
    for (const text of items) {
      const li = new Y.XmlElement('list_item')
      const segmentId = generateSegmentId()
      li.setAttribute('segmentId', segmentId)
      ids.push(segmentId)
      const p = new Y.XmlElement('paragraph')
      const t = new Y.XmlText()
      t.insert(0, text)
      p.insert(0, [t])
      li.insert(0, [p])
      ol.push([li])
    }
    content.push([ol])
    return ids
  }

  // Add a paragraph containing only an inline image (how y-prosemirror stores it)
  function addImageParagraph(content: Y.XmlFragment, src: string, alt = 'Image'): string {
    const p = new Y.XmlElement('paragraph')
    const segmentId = generateSegmentId()
    p.setAttribute('segmentId', segmentId)
    const img = new Y.XmlElement('image')
    img.setAttribute('src', src)
    img.setAttribute('alt', alt)
    p.insert(0, [img])
    content.push([p])
    return segmentId
  }

  // Add a paragraph with text before and after an inline image
  function addParagraphWithInlineImage(
    content: Y.XmlFragment,
    textBefore: string,
    src: string,
    alt: string,
    textAfter: string,
  ): string {
    const p = new Y.XmlElement('paragraph')
    const segmentId = generateSegmentId()
    p.setAttribute('segmentId', segmentId)
    const t1 = new Y.XmlText()
    t1.insert(0, textBefore)
    const img = new Y.XmlElement('image')
    img.setAttribute('src', src)
    img.setAttribute('alt', alt)
    const t2 = new Y.XmlText()
    t2.insert(0, textAfter)
    p.insert(0, [t1, img, t2])
    content.push([p])
    return segmentId
  }

  describe('single mode in follow mode', () => {
    it('only renders the current segment', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id1,
      })

      // Only current segment should be rendered
      await expect.element(page.getByText('Segment 0')).not.toBeInTheDocument()
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 2')).not.toBeInTheDocument()
    })

    it('renders all segments in the same merge group as current', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')
      const id3 = addParagraph(content, 'Segment 3')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Segment 0', type: 'paragraph', slideIndex: 0 },
        { id: id1, index: 1, label: 'Segment 1', type: 'paragraph', slideIndex: 0, mergeGroupId: 'merge-1' },
        { id: id2, index: 2, label: 'Segment 2', type: 'paragraph', slideIndex: 0, mergeGroupId: 'merge-1' },
        { id: id3, index: 3, label: 'Segment 3', type: 'paragraph', slideIndex: 0 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id1,
      })

      // Segment not in merge group should NOT be rendered
      await expect.element(page.getByText('Segment 0')).not.toBeInTheDocument()
      // Both segments in merge group should be rendered
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 2')).toBeInTheDocument()
      // Segment not in merge group should NOT be rendered
      await expect.element(page.getByText('Segment 3')).not.toBeInTheDocument()
    })

    it('renders exactly 1 segment on first render in single mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'First segment')
      const id1 = addParagraph(content, 'Second segment')
      const id2 = addParagraph(content, 'Third segment')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id0,
      })

      // Count visible segment elements
      const segmentElements = document.querySelectorAll('[data-segment-id]')
      expect(segmentElements.length).toBe(1)

      // Verify it's the correct segment
      await expect.element(page.getByText('First segment')).toBeInTheDocument()
      await expect.element(page.getByText('Second segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Third segment')).not.toBeInTheDocument()
    })
  })

  describe('block mode in follow mode', () => {
    it('renders all segments in the same contiguous block', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Block 1 Segment A')
      const id1 = addParagraph(content, 'Block 1 Segment B')
      addEmptyParagraph(content) // Empty paragraph acts as block boundary
      const id2 = addParagraph(content, 'Block 2 Segment C')
      const id3 = addParagraph(content, 'Block 2 Segment D')

      const segments = createSegments([id0, id1, id2, id3])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id0, // In first block
      })

      // First block should be rendered
      await expect.element(page.getByText('Block 1 Segment A')).toBeInTheDocument()
      await expect.element(page.getByText('Block 1 Segment B')).toBeInTheDocument()
      // Second block should NOT be rendered
      await expect.element(page.getByText('Block 2 Segment C')).not.toBeInTheDocument()
      await expect.element(page.getByText('Block 2 Segment D')).not.toBeInTheDocument()
    })

    it('renders second block when current segment is in second block', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Block 1 Segment A')
      const id1 = addParagraph(content, 'Block 1 Segment B')
      addEmptyParagraph(content) // Empty paragraph acts as block boundary
      const id2 = addParagraph(content, 'Block 2 Segment C')
      const id3 = addParagraph(content, 'Block 2 Segment D')

      const segments = createSegments([id0, id1, id2, id3])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id2, // In second block
      })

      // First block should NOT be rendered
      await expect.element(page.getByText('Block 1 Segment A')).not.toBeInTheDocument()
      await expect.element(page.getByText('Block 1 Segment B')).not.toBeInTheDocument()
      // Second block should be rendered
      await expect.element(page.getByText('Block 2 Segment C')).toBeInTheDocument()
      await expect.element(page.getByText('Block 2 Segment D')).toBeInTheDocument()
    })

    it('treats slide_divider as block boundary', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Before divider')
      addSlideDivider(content)
      const id1 = addParagraph(content, 'After divider')

      const segments = createSegments([id0, id1])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id0,
      })

      // Only content before divider should be rendered
      await expect.element(page.getByText('Before divider')).toBeInTheDocument()
      await expect.element(page.getByText('After divider')).not.toBeInTheDocument()
    })

    it('renders all segments when no block boundaries exist', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment A')
      const id1 = addParagraph(content, 'Segment B')
      const id2 = addParagraph(content, 'Segment C')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id1,
      })

      // All segments in the same block should be rendered
      await expect.element(page.getByText('Segment A')).toBeInTheDocument()
      await expect.element(page.getByText('Segment B')).toBeInTheDocument()
      await expect.element(page.getByText('Segment C')).toBeInTheDocument()
    })

    it('shows only the middle block when navigating to it (3 blocks)', async () => {
      const content = createContent()
      // Block 1
      const id0 = addParagraph(content, 'Block1 Para1')
      const id1 = addParagraph(content, 'Block1 Para2')
      addEmptyParagraph(content) // Block boundary
      // Block 2
      const id2 = addParagraph(content, 'Block2 Para1')
      const id3 = addParagraph(content, 'Block2 Para2')
      addEmptyParagraph(content) // Block boundary
      // Block 3
      const id4 = addParagraph(content, 'Block3 Para1')
      const id5 = addParagraph(content, 'Block3 Para2')

      const segments = createSegments([id0, id1, id2, id3, id4, id5])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id2, // Navigate to Block 2
      })

      // Block 1 should NOT be visible
      await expect.element(page.getByText('Block1 Para1')).not.toBeInTheDocument()
      await expect.element(page.getByText('Block1 Para2')).not.toBeInTheDocument()
      // Block 2 should be visible
      await expect.element(page.getByText('Block2 Para1')).toBeInTheDocument()
      await expect.element(page.getByText('Block2 Para2')).toBeInTheDocument()
      // Block 3 should NOT be visible
      await expect.element(page.getByText('Block3 Para1')).not.toBeInTheDocument()
      await expect.element(page.getByText('Block3 Para2')).not.toBeInTheDocument()
    })

    it('treats empty paragraphs with no children as block boundaries', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Block A content')
      addEmptyParagraphNoChild(content) // Empty paragraph with no XmlText child
      const id1 = addParagraph(content, 'Block B content')

      const segments = createSegments([id0, id1])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id0,
      })

      // Block A should be visible
      await expect.element(page.getByText('Block A content')).toBeInTheDocument()
      // Block B should NOT be visible
      await expect.element(page.getByText('Block B content')).not.toBeInTheDocument()
    })

    it('treats empty paragraphs with null segmentId as block boundaries', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Block X content')
      addEmptyParagraphWithNullSegmentId(content) // Empty paragraph with segmentId=null
      const id1 = addParagraph(content, 'Block Y content')

      const segments = createSegments([id0, id1])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id0,
      })

      // Block X should be visible
      await expect.element(page.getByText('Block X content')).toBeInTheDocument()
      // Block Y should NOT be visible
      await expect.element(page.getByText('Block Y content')).not.toBeInTheDocument()
    })

    it('correctly separates blocks with headings and paragraphs', async () => {
      const content = createContent()
      // Block 1: Heading + paragraph
      const h1 = addHeading(content, 'Block 1 Title')
      const p1 = addParagraph(content, 'Block 1 content')
      addEmptyParagraph(content) // Block boundary
      // Block 2: Heading + paragraph
      const h2 = addHeading(content, 'Block 2 Title')
      const p2 = addParagraph(content, 'Block 2 content')

      const segments: ContentSegment[] = [
        { id: h1, index: 0, label: 'Block 1 Title', type: 'heading', slideIndex: 0, level: 1 },
        { id: p1, index: 1, label: 'Block 1 content', type: 'paragraph', slideIndex: 0 },
        { id: h2, index: 2, label: 'Block 2 Title', type: 'heading', slideIndex: 0, level: 1 },
        { id: p2, index: 3, label: 'Block 2 content', type: 'paragraph', slideIndex: 0 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: h1, // Navigate to Block 1
      })

      // Block 1 should be visible
      await expect.element(page.getByText('Block 1 Title')).toBeInTheDocument()
      await expect.element(page.getByText('Block 1 content')).toBeInTheDocument()
      // Block 2 should NOT be visible
      await expect.element(page.getByText('Block 2 Title')).not.toBeInTheDocument()
      await expect.element(page.getByText('Block 2 content')).not.toBeInTheDocument()
    })
  })

  describe('ordered list numbering preservation', () => {
    it('preserves list numbering when list is split across blocks', async () => {
      const content = createContent()
      // Create an ordered list with 4 items, split by an empty paragraph
      const listIds = addOrderedList(content, ['First item', 'Second item'])
      addEmptyParagraph(content)
      const listIds2 = addOrderedList(content, ['Third item', 'Fourth item'])

      const segments: ContentSegment[] = [
        { id: listIds[0], index: 0, label: 'First item', type: 'list-item', slideIndex: 0 },
        { id: listIds[1], index: 1, label: 'Second item', type: 'list-item', slideIndex: 0 },
        { id: listIds2[0], index: 2, label: 'Third item', type: 'list-item', slideIndex: 1 },
        { id: listIds2[1], index: 3, label: 'Fourth item', type: 'list-item', slideIndex: 1 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: listIds2[0], // Show second block (Third item, Fourth item)
      })

      // Second block items should be visible
      await expect.element(page.getByText('Third item')).toBeInTheDocument()
      await expect.element(page.getByText('Fourth item')).toBeInTheDocument()

      // First block items should NOT be visible
      await expect.element(page.getByText('First item')).not.toBeInTheDocument()
      await expect.element(page.getByText('Second item')).not.toBeInTheDocument()

      // The ol should start at 1 for the second list (it's a separate list element)
      const olElement = document.querySelector('ol')
      expect(olElement).toBeTruthy()
    })

    it('sets correct value on visible list item in single mode', async () => {
      const content = createContent()
      const listIds = addOrderedList(content, ['Item 1', 'Item 2', 'Item 3', 'Item 4'])

      const segments: ContentSegment[] = [
        { id: listIds[0], index: 0, label: 'Item 1', type: 'list-item', slideIndex: 0 },
        { id: listIds[1], index: 1, label: 'Item 2', type: 'list-item', slideIndex: 0 },
        { id: listIds[2], index: 2, label: 'Item 3', type: 'list-item', slideIndex: 0 },
        { id: listIds[3], index: 3, label: 'Item 4', type: 'list-item', slideIndex: 0 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: listIds[2], // Show third item
      })

      // Only Item 3 should be visible
      await expect.element(page.getByText('Item 3')).toBeInTheDocument()
      await expect.element(page.getByText('Item 1')).not.toBeInTheDocument()
      await expect.element(page.getByText('Item 2')).not.toBeInTheDocument()
      await expect.element(page.getByText('Item 4')).not.toBeInTheDocument()

      // The visible li should have value="3"
      const liElement = document.querySelector(`[data-segment-id="${listIds[2]}"]`)
      expect(liElement?.getAttribute('value')).toBe('3')
    })

    it('sets correct values on visible list items in minimal mode', async () => {
      const content = createContent()
      const listIds = addOrderedList(content, ['Item 1', 'Item 2', 'Item 3', 'Item 4'])

      const segments: ContentSegment[] = [
        { id: listIds[0], index: 0, label: 'Item 1', type: 'list-item', slideIndex: 0 },
        { id: listIds[1], index: 1, label: 'Item 2', type: 'list-item', slideIndex: 0 },
        { id: listIds[2], index: 2, label: 'Item 3', type: 'list-item', slideIndex: 0 },
        { id: listIds[3], index: 3, label: 'Item 4', type: 'list-item', slideIndex: 0 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: listIds[2], // Show second pair (items 3 and 4)
      })

      // Items 3 and 4 should be visible
      await expect.element(page.getByText('Item 3')).toBeInTheDocument()
      await expect.element(page.getByText('Item 4')).toBeInTheDocument()
      await expect.element(page.getByText('Item 1')).not.toBeInTheDocument()
      await expect.element(page.getByText('Item 2')).not.toBeInTheDocument()

      // Each visible li should have its correct value
      const li3 = document.querySelector(`[data-segment-id="${listIds[2]}"]`)
      const li4 = document.querySelector(`[data-segment-id="${listIds[3]}"]`)
      expect(li3?.getAttribute('value')).toBe('3')
      expect(li4?.getAttribute('value')).toBe('4')
    })

    it('preserves custom start order on list item values', async () => {
      const content = createContent()
      // List starting at 5
      const listIds = addOrderedList(content, ['Item A', 'Item B', 'Item C'], 5)

      const segments: ContentSegment[] = [
        { id: listIds[0], index: 0, label: 'Item A', type: 'list-item', slideIndex: 0 },
        { id: listIds[1], index: 1, label: 'Item B', type: 'list-item', slideIndex: 0 },
        { id: listIds[2], index: 2, label: 'Item C', type: 'list-item', slideIndex: 0 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: listIds[1], // Show Item B (originally item 6)
      })

      // Only Item B should be visible
      await expect.element(page.getByText('Item B')).toBeInTheDocument()
      await expect.element(page.getByText('Item A')).not.toBeInTheDocument()
      await expect.element(page.getByText('Item C')).not.toBeInTheDocument()

      // The li should have value="6" (base 5 + 1 position offset)
      const liElement = document.querySelector(`[data-segment-id="${listIds[1]}"]`)
      expect(liElement?.getAttribute('value')).toBe('6')
    })
  })

  describe('minimal mode in follow mode', () => {
    it('only renders segments in the current pair (first pair)', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')
      const id3 = addParagraph(content, 'Segment 3')

      const segments = createSegments([id0, id1, id2, id3])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: id0, // First segment -> first pair (0, 1)
      })

      // First pair should be rendered
      await expect.element(page.getByText('Segment 0')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()

      // Second pair should NOT be rendered
      await expect.element(page.getByText('Segment 2')).not.toBeInTheDocument()
      await expect.element(page.getByText('Segment 3')).not.toBeInTheDocument()
    })

    it('only renders segments in the current pair (second pair)', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')
      const id3 = addParagraph(content, 'Segment 3')

      const segments = createSegments([id0, id1, id2, id3])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: id2, // Third segment -> second pair (2, 3)
      })

      // First pair should NOT be rendered
      await expect.element(page.getByText('Segment 0')).not.toBeInTheDocument()
      await expect.element(page.getByText('Segment 1')).not.toBeInTheDocument()

      // Second pair should be rendered
      await expect.element(page.getByText('Segment 2')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 3')).toBeInTheDocument()
    })
  })

  describe('maximal mode in follow mode', () => {
    it('renders all segments on the current slide', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'maximal',
        segments,
        currentSegmentId: id1,
      })

      // All segments are on the same slide, so all should be visible
      await expect.element(page.getByText('Segment 0')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 2')).toBeInTheDocument()
    })

    it('only renders segments from the current slide', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Slide 1 content')
      const id1 = addParagraph(content, 'Slide 2 first')
      const id2 = addParagraph(content, 'Slide 2 second')
      const id3 = addParagraph(content, 'Slide 3 content')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Slide 1 content', type: 'paragraph', slideIndex: 0 },
        { id: id1, index: 1, label: 'Slide 2 first', type: 'paragraph', slideIndex: 1 },
        { id: id2, index: 2, label: 'Slide 2 second', type: 'paragraph', slideIndex: 1 },
        { id: id3, index: 3, label: 'Slide 3 content', type: 'paragraph', slideIndex: 2 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'maximal',
        segments,
        currentSegmentId: id1, // On slide 2
      })

      // Slide 1 content should NOT be rendered
      await expect.element(page.getByText('Slide 1 content')).not.toBeInTheDocument()
      // Both slide 2 segments should be rendered
      await expect.element(page.getByText('Slide 2 first')).toBeInTheDocument()
      await expect.element(page.getByText('Slide 2 second')).toBeInTheDocument()
      // Slide 3 content should NOT be rendered
      await expect.element(page.getByText('Slide 3 content')).not.toBeInTheDocument()
    })
  })

  describe('scrolling mode in follow mode', () => {
    it('renders all segments when no slide dividers exist', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'scrolling',
        segments,
        currentSegmentId: id1,
      })

      // All segments should be rendered in scrolling mode (all on slide 0)
      await expect.element(page.getByText('Segment 0')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 2')).toBeInTheDocument()
    })

    it('applies faded class to segments above current', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'scrolling',
        segments,
        currentSegmentId: id2, // Last segment is current
      })

      // Previous segments should have faded class
      const seg0 = page.getByText('Segment 0').element().parentElement
      const seg1 = page.getByText('Segment 1').element().parentElement
      const seg2 = page.getByText('Segment 2').element().parentElement

      expect(seg0?.classList.contains('segment-faded')).toBe(true)
      expect(seg1?.classList.contains('segment-faded')).toBe(true)
      expect(seg2?.classList.contains('segment-faded')).toBe(false)
    })

    it('only shows segments from the current slide when slide dividers exist', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Slide 1 Para A')
      const id1 = addParagraph(content, 'Slide 1 Para B')
      addSlideDivider(content)
      const id2 = addParagraph(content, 'Slide 2 Para C')
      const id3 = addParagraph(content, 'Slide 2 Para D')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Slide 1 Para A', type: 'paragraph', slideIndex: 0 },
        { id: id1, index: 1, label: 'Slide 1 Para B', type: 'paragraph', slideIndex: 0 },
        { id: id2, index: 2, label: 'Slide 2 Para C', type: 'paragraph', slideIndex: 1 },
        { id: id3, index: 3, label: 'Slide 2 Para D', type: 'paragraph', slideIndex: 1 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'scrolling',
        segments,
        currentSegmentId: id0, // Current is on slide 0
      })

      // Slide 1 content should be visible
      await expect.element(page.getByText('Slide 1 Para A')).toBeInTheDocument()
      await expect.element(page.getByText('Slide 1 Para B')).toBeInTheDocument()
      // Slide 2 content should NOT be visible
      await expect.element(page.getByText('Slide 2 Para C')).not.toBeInTheDocument()
      await expect.element(page.getByText('Slide 2 Para D')).not.toBeInTheDocument()
    })

    it('shows slide 2 segments when navigating to a segment on slide 2', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Slide 1 content')
      addSlideDivider(content)
      const id1 = addParagraph(content, 'Slide 2 content')
      const id2 = addParagraph(content, 'Slide 2 more')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Slide 1 content', type: 'paragraph', slideIndex: 0 },
        { id: id1, index: 1, label: 'Slide 2 content', type: 'paragraph', slideIndex: 1 },
        { id: id2, index: 2, label: 'Slide 2 more', type: 'paragraph', slideIndex: 1 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'scrolling',
        segments,
        currentSegmentId: id1, // Navigate to slide 2
      })

      // Slide 1 should be hidden
      await expect.element(page.getByText('Slide 1 content')).not.toBeInTheDocument()
      // Slide 2 should be visible
      await expect.element(page.getByText('Slide 2 content')).toBeInTheDocument()
      await expect.element(page.getByText('Slide 2 more')).toBeInTheDocument()
    })

    it('applies fading to past segments within the visible slide', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Slide 1 first')
      const id1 = addParagraph(content, 'Slide 1 second')
      const id2 = addParagraph(content, 'Slide 1 third')
      addSlideDivider(content)
      const id3 = addParagraph(content, 'Slide 2 content')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Slide 1 first', type: 'paragraph', slideIndex: 0 },
        { id: id1, index: 1, label: 'Slide 1 second', type: 'paragraph', slideIndex: 0 },
        { id: id2, index: 2, label: 'Slide 1 third', type: 'paragraph', slideIndex: 0 },
        { id: id3, index: 3, label: 'Slide 2 content', type: 'paragraph', slideIndex: 1 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'scrolling',
        segments,
        currentSegmentId: id2, // Last segment on slide 1
      })

      // All slide 1 segments visible
      await expect.element(page.getByText('Slide 1 first')).toBeInTheDocument()
      await expect.element(page.getByText('Slide 1 second')).toBeInTheDocument()
      await expect.element(page.getByText('Slide 1 third')).toBeInTheDocument()

      // Past segments on the same slide should be faded
      const seg0 = page.getByText('Slide 1 first').element().parentElement
      const seg1 = page.getByText('Slide 1 second').element().parentElement
      const seg2 = page.getByText('Slide 1 third').element().parentElement

      expect(seg0?.classList.contains('segment-faded')).toBe(true)
      expect(seg1?.classList.contains('segment-faded')).toBe(true)
      expect(seg2?.classList.contains('segment-faded')).toBe(false)

      // Slide 2 content should not be visible
      await expect.element(page.getByText('Slide 2 content')).not.toBeInTheDocument()
    })

    it('hides slide divider hr in follow mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Before divider')
      addSlideDivider(content)
      const id1 = addParagraph(content, 'After divider')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Before divider', type: 'paragraph', slideIndex: 0 },
        { id: id1, index: 1, label: 'After divider', type: 'paragraph', slideIndex: 1 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'scrolling',
        segments,
        currentSegmentId: id0,
      })

      // The slide divider hr should not be rendered
      const dividers = document.querySelectorAll('hr.slide-divider')
      expect(dividers.length).toBe(0)
    })
  })

  describe('presenter mode (mode="present")', () => {
    it('renders all segments regardless of single format', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'present', // Presenter mode
        format: 'single',
        segments,
        currentSegmentId: id1,
      })

      // All segments should be rendered in presenter mode
      await expect.element(page.getByText('Segment 0')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 2')).toBeInTheDocument()
    })

    it('renders all segments regardless of block format', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Block 1 Segment')
      addEmptyParagraph(content)
      const id1 = addParagraph(content, 'Block 2 Segment')

      const segments = createSegments([id0, id1])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'present', // Presenter mode
        format: 'block',
        segments,
        currentSegmentId: id0,
      })

      // All segments should be rendered in presenter mode regardless of block boundaries
      await expect.element(page.getByText('Block 1 Segment')).toBeInTheDocument()
      await expect.element(page.getByText('Block 2 Segment')).toBeInTheDocument()
    })

    it('renders all segments regardless of minimal format', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')
      const id3 = addParagraph(content, 'Segment 3')

      const segments = createSegments([id0, id1, id2, id3])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'present', // Presenter mode
        format: 'minimal',
        segments,
        currentSegmentId: id0,
      })

      // All segments should be rendered in presenter mode
      await expect.element(page.getByText('Segment 0')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 2')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 3')).toBeInTheDocument()
    })

    it('renders all segments regardless of maximal format', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')
      const id2 = addParagraph(content, 'Segment 2')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'present', // Presenter mode
        format: 'maximal',
        segments,
        currentSegmentId: id1,
      })

      // All segments should be rendered in presenter mode
      await expect.element(page.getByText('Segment 0')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 2')).toBeInTheDocument()
    })

    it('does not apply faded class in scrolling format', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment 0')
      const id1 = addParagraph(content, 'Segment 1')

      const segments = createSegments([id0, id1])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'present', // Presenter mode
        format: 'scrolling',
        segments,
        currentSegmentId: id1,
      })

      // Previous segment should NOT have faded class in presenter mode
      const seg0 = page.getByText('Segment 0').element().parentElement
      expect(seg0?.classList.contains('segment-faded')).toBe(false)
    })
  })

  describe('view mode (no segments)', () => {
    it('renders all content without segment wrappers', async () => {
      const content = createContent()
      addParagraph(content, 'Content A')
      addParagraph(content, 'Content B')

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'view',
        format: 'minimal',
        segments: [],
        currentSegmentId: null,
      })

      // All content should be rendered
      await expect.element(page.getByText('Content A')).toBeInTheDocument()
      await expect.element(page.getByText('Content B')).toBeInTheDocument()
    })
  })

  describe('first render behavior', () => {
    it('renders exactly 2 segments on first render in minimal mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'First segment')
      const id1 = addParagraph(content, 'Second segment')
      const id2 = addParagraph(content, 'Third segment')
      const id3 = addParagraph(content, 'Fourth segment')
      const id4 = addParagraph(content, 'Fifth segment')
      const id5 = addParagraph(content, 'Sixth segment')

      const segments = createSegments([id0, id1, id2, id3, id4, id5])

      // First render with minimal mode and position at segment 0
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: id0,
      })

      // Count visible segment elements
      const segmentElements = document.querySelectorAll('[data-segment-id]')
      expect(segmentElements.length).toBe(2)

      // Verify it's the correct pair (first two)
      await expect.element(page.getByText('First segment')).toBeInTheDocument()
      await expect.element(page.getByText('Second segment')).toBeInTheDocument()
      await expect.element(page.getByText('Third segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Fourth segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Fifth segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Sixth segment')).not.toBeInTheDocument()
    })

    it('renders all slide segments on first render in maximal mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'First segment')
      const id1 = addParagraph(content, 'Second segment')
      const id2 = addParagraph(content, 'Third segment')
      const id3 = addParagraph(content, 'Fourth segment')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'First segment', type: 'paragraph', slideIndex: 0 },
        { id: id1, index: 1, label: 'Second segment', type: 'paragraph', slideIndex: 0 },
        { id: id2, index: 2, label: 'Third segment', type: 'paragraph', slideIndex: 1 },
        { id: id3, index: 3, label: 'Fourth segment', type: 'paragraph', slideIndex: 1 },
      ]

      // First render with maximal mode and position at segment 2 (slide 1)
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'maximal',
        segments,
        currentSegmentId: id2,
      })

      // Only slide 1 segments should be visible
      await expect.element(page.getByText('First segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Second segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Third segment')).toBeInTheDocument()
      await expect.element(page.getByText('Fourth segment')).toBeInTheDocument()
    })

    it('applies minimal mode correctly on first render with middle position', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Seg A')
      const id1 = addParagraph(content, 'Seg B')
      const id2 = addParagraph(content, 'Seg C')
      const id3 = addParagraph(content, 'Seg D')
      const id4 = addParagraph(content, 'Seg E')
      const id5 = addParagraph(content, 'Seg F')

      const segments = createSegments([id0, id1, id2, id3, id4, id5])

      // First render with position at segment 3 (second pair: segments 2 and 3)
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: id3,
      })

      // Count visible segment elements - should be exactly 2
      const segmentElements = document.querySelectorAll('[data-segment-id]')
      expect(segmentElements.length).toBe(2)

      // Verify it's the correct pair (C and D)
      await expect.element(page.getByText('Seg A')).not.toBeInTheDocument()
      await expect.element(page.getByText('Seg B')).not.toBeInTheDocument()
      await expect.element(page.getByText('Seg C')).toBeInTheDocument()
      await expect.element(page.getByText('Seg D')).toBeInTheDocument()
      await expect.element(page.getByText('Seg E')).not.toBeInTheDocument()
      await expect.element(page.getByText('Seg F')).not.toBeInTheDocument()
    })
  })

  describe('sentence segment visibility (keeping split paragraphs together)', () => {
    it('shows all sentences in a paragraph when navigating to any sentence in single mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Regular paragraph before')
      const longParaId = addLongParagraph(
        content,
        'First sentence of a long paragraph. Second sentence continues the thought. Third sentence wraps it up.',
      )
      const id2 = addParagraph(content, 'Regular paragraph after')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Regular paragraph before', type: 'paragraph', slideIndex: 0 },
        ...createSentenceSegments(
          longParaId,
          [
            'First sentence of a long paragraph.',
            'Second sentence continues the thought.',
            'Third sentence wraps it up.',
          ],
          1,
        ),
        { id: id2, index: 4, label: 'Regular paragraph after', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to the second sentence
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: `${longParaId}:s1`,
      })

      // All three sentences should be visible (entire paragraph)
      await expect.element(page.getByText('First sentence of a long paragraph.')).toBeInTheDocument()
      await expect.element(page.getByText('Second sentence continues the thought.')).toBeInTheDocument()
      await expect.element(page.getByText('Third sentence wraps it up.')).toBeInTheDocument()

      // Other paragraphs should NOT be visible
      await expect.element(page.getByText('Regular paragraph before')).not.toBeInTheDocument()
      await expect.element(page.getByText('Regular paragraph after')).not.toBeInTheDocument()
    })

    it('individual sentences have separate data-segment-id attributes', async () => {
      const content = createContent()
      const longParaId = addLongParagraph(content, 'Sentence one here. Sentence two here. Sentence three here.')

      const segments: ContentSegment[] = createSentenceSegments(
        longParaId,
        ['Sentence one here.', 'Sentence two here.', 'Sentence three here.'],
        0,
      )

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: `${longParaId}:s0`,
      })

      // Each sentence should have its own segment ID
      const segmentElements = document.querySelectorAll('[data-segment-id]')
      expect(segmentElements.length).toBe(3)

      const segmentIds = Array.from(segmentElements).map((el) => el.getAttribute('data-segment-id'))
      expect(segmentIds).toContain(`${longParaId}:s0`)
      expect(segmentIds).toContain(`${longParaId}:s1`)
      expect(segmentIds).toContain(`${longParaId}:s2`)
    })

    it('only the active sentence has segment-active class', async () => {
      const content = createContent()
      const longParaId = addLongParagraph(content, 'Active sentence. Inactive sibling one. Inactive sibling two.')

      const segments: ContentSegment[] = createSentenceSegments(
        longParaId,
        ['Active sentence.', 'Inactive sibling one.', 'Inactive sibling two.'],
        0,
      )

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: `${longParaId}:s0`, // First sentence is active
      })

      // Only the first sentence should have segment-active class
      const activeElement = document.querySelector(`[data-segment-id="${longParaId}:s0"]`) as HTMLElement
      const sibling1 = document.querySelector(`[data-segment-id="${longParaId}:s1"]`) as HTMLElement
      const sibling2 = document.querySelector(`[data-segment-id="${longParaId}:s2"]`) as HTMLElement

      expect(activeElement?.classList.contains('segment-active')).toBe(true)
      expect(sibling1?.classList.contains('segment-active')).toBe(false)
      expect(sibling2?.classList.contains('segment-active')).toBe(false)
    })

    it('shows all sentences in a paragraph in maximal mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Before paragraph')
      const longParaId = addLongParagraph(content, 'First part. Second part. Third part.')
      const id2 = addParagraph(content, 'After paragraph')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Before paragraph', type: 'paragraph', slideIndex: 0 },
        ...createSentenceSegments(longParaId, ['First part.', 'Second part.', 'Third part.'], 1),
        { id: id2, index: 4, label: 'After paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'maximal',
        segments,
        currentSegmentId: `${longParaId}:s2`, // Navigate to third sentence
      })

      // All segments on the same slide should be visible (maximal shows entire slide)
      await expect.element(page.getByText('First part.')).toBeInTheDocument()
      await expect.element(page.getByText('Second part.')).toBeInTheDocument()
      await expect.element(page.getByText('Third part.')).toBeInTheDocument()
      await expect.element(page.getByText('Before paragraph')).toBeInTheDocument()
      await expect.element(page.getByText('After paragraph')).toBeInTheDocument()
    })

    it('shows all sentences in a paragraph when sentence is part of minimal pair', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'First regular paragraph')
      const longParaId = addLongParagraph(content, 'Long one. Long two. Long three.')
      const id2 = addParagraph(content, 'Third regular paragraph')
      const id3 = addParagraph(content, 'Fourth regular paragraph')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'First regular paragraph', type: 'paragraph', slideIndex: 0 },
        ...createSentenceSegments(longParaId, ['Long one.', 'Long two.', 'Long three.'], 1),
        { id: id2, index: 4, label: 'Third regular paragraph', type: 'paragraph', slideIndex: 0 },
        { id: id3, index: 5, label: 'Fourth regular paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to first sentence (index 1), which pairs with second sentence (index 2)
      // Both are from the same long paragraph
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: `${longParaId}:s0`,
      })

      // The pair is segments at index 0 and 1: "First regular paragraph" and "Long one."
      // But "Long one." is a sentence, so all siblings should also be visible
      await expect.element(page.getByText('First regular paragraph')).toBeInTheDocument()
      await expect.element(page.getByText('Long one.')).toBeInTheDocument()
      await expect.element(page.getByText('Long two.')).toBeInTheDocument()
      await expect.element(page.getByText('Long three.')).toBeInTheDocument()

      // Paragraphs outside the pair should NOT be visible
      await expect.element(page.getByText('Third regular paragraph')).not.toBeInTheDocument()
      await expect.element(page.getByText('Fourth regular paragraph')).not.toBeInTheDocument()
    })

    it('independent paragraphs with sentences do not affect each other', async () => {
      const content = createContent()
      const para1Id = addLongParagraph(content, 'Para1 sent1. Para1 sent2.')
      const para2Id = addLongParagraph(content, 'Para2 sent1. Para2 sent2.')

      const segments: ContentSegment[] = [
        ...createSentenceSegments(para1Id, ['Para1 sent1.', 'Para1 sent2.'], 0),
        ...createSentenceSegments(para2Id, ['Para2 sent1.', 'Para2 sent2.'], 2),
      ]

      // Navigate to first sentence of first paragraph
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: `${para1Id}:s0`,
      })

      // Only first paragraph's sentences should be visible
      await expect.element(page.getByText('Para1 sent1.')).toBeInTheDocument()
      await expect.element(page.getByText('Para1 sent2.')).toBeInTheDocument()

      // Second paragraph's sentences should NOT be visible
      await expect.element(page.getByText('Para2 sent1.')).not.toBeInTheDocument()
      await expect.element(page.getByText('Para2 sent2.')).not.toBeInTheDocument()
    })

    it('keeps sentence segments on the same block in block mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Block 1 paragraph')
      const longParaId = addLongParagraph(content, 'First sentence here. Second sentence here. Third sentence here.')
      addEmptyParagraph(content) // Block boundary
      const id2 = addParagraph(content, 'Block 2 paragraph')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'Block 1', type: 'paragraph', slideIndex: 0 },
        ...createSentenceSegments(
          longParaId,
          ['First sentence here.', 'Second sentence here.', 'Third sentence here.'],
          1,
        ),
        { id: id2, index: 4, label: 'Block 2', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to second sentence - should show all of block 1
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: `${longParaId}:s1`,
      })

      // Block 1 content visible
      await expect.element(page.getByText('Block 1 paragraph')).toBeInTheDocument()
      await expect.element(page.getByText('First sentence here.')).toBeInTheDocument()
      await expect.element(page.getByText('Second sentence here.')).toBeInTheDocument()
      await expect.element(page.getByText('Third sentence here.')).toBeInTheDocument()

      // Block 2 hidden
      await expect.element(page.getByText('Block 2 paragraph')).not.toBeInTheDocument()
    })

    it('uses first sentence index for pair computation in minimal mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'First paragraph')
      const longParaId = addLongParagraph(content, 'Sentence one here. Sentence two here. Sentence three here.')
      const id2 = addParagraph(content, 'Third paragraph')
      const id3 = addParagraph(content, 'Fourth paragraph')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'First paragraph', type: 'paragraph', slideIndex: 0 },
        ...createSentenceSegments(longParaId, ['Sentence one here.', 'Sentence two here.', 'Sentence three here.'], 1),
        { id: id2, index: 4, label: 'Third paragraph', type: 'paragraph', slideIndex: 0 },
        { id: id3, index: 5, label: 'Fourth paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to sentence at index 2 (second sentence)
      // First sentence is at index 1, so pair 0 (indices 0-1) should be used
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: `${longParaId}:s1`,
      })

      // Pair 0 content + all sibling sentences should be visible
      await expect.element(page.getByText('First paragraph')).toBeInTheDocument()
      await expect.element(page.getByText('Sentence one here.')).toBeInTheDocument()
      await expect.element(page.getByText('Sentence two here.')).toBeInTheDocument()
      await expect.element(page.getByText('Sentence three here.')).toBeInTheDocument()

      // Content outside pair 0 should NOT be visible
      await expect.element(page.getByText('Third paragraph')).not.toBeInTheDocument()
      await expect.element(page.getByText('Fourth paragraph')).not.toBeInTheDocument()
    })

    it('does not show sentence paragraph on subsequent slides in minimal mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'First paragraph')
      const longParaId = addLongParagraph(content, 'Sentence one here. Sentence two here. Sentence three here.')
      const id2 = addParagraph(content, 'Third paragraph')
      const id3 = addParagraph(content, 'Fourth paragraph')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: 'First paragraph', type: 'paragraph', slideIndex: 0 },
        ...createSentenceSegments(longParaId, ['Sentence one here.', 'Sentence two here.', 'Sentence three here.'], 1),
        { id: id2, index: 4, label: 'Third paragraph', type: 'paragraph', slideIndex: 0 },
        { id: id3, index: 5, label: 'Fourth paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to segment at index 4 (Third paragraph) - this is pair 2
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: id2,
      })

      // Pair 2 content should be visible
      await expect.element(page.getByText('Third paragraph')).toBeInTheDocument()
      await expect.element(page.getByText('Fourth paragraph')).toBeInTheDocument()

      // Previous content should NOT be visible (including the sentence paragraph)
      await expect.element(page.getByText('First paragraph')).not.toBeInTheDocument()
      await expect.element(page.getByText('Sentence one here.')).not.toBeInTheDocument()
      await expect.element(page.getByText('Sentence two here.')).not.toBeInTheDocument()
      await expect.element(page.getByText('Sentence three here.')).not.toBeInTheDocument()
    })

    it('does not render sentences from wrong paragraph when parentSegmentId does not match', async () => {
      // This tests that sentence segments are only rendered when their parentSegmentId
      // matches the current DOM element's segmentId - preventing cross-paragraph rendering
      const content = createContent()
      const para1Id = addLongParagraph(content, 'Para1 sentA. Para1 sentB.')
      const para2Id = addLongParagraph(content, 'Para2 sentA. Para2 sentB.')

      // Both paragraphs have sentence segments with distinct parentSegmentIds
      const segments: ContentSegment[] = [
        ...createSentenceSegments(para1Id, ['Para1 sentA.', 'Para1 sentB.'], 0),
        ...createSentenceSegments(para2Id, ['Para2 sentA.', 'Para2 sentB.'], 2),
      ]

      // Navigate to first paragraph's first sentence
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: `${para1Id}:s0`,
      })

      // Para1 sentences should be visible (current + siblings)
      await expect.element(page.getByText('Para1 sentA.')).toBeInTheDocument()
      await expect.element(page.getByText('Para1 sentB.')).toBeInTheDocument()

      // Para2 sentences should NOT be visible - parentSegmentId doesn't match para1's segmentId
      await expect.element(page.getByText('Para2 sentA.')).not.toBeInTheDocument()
      await expect.element(page.getByText('Para2 sentB.')).not.toBeInTheDocument()
    })

    it('correctly matches sentence segments to their parent paragraph only', async () => {
      // Test that sentence segments are only rendered for their matching paragraph
      // not for other paragraphs that happen to be at the same ctx.segmentIndex
      const content = createContent()
      const para1Id = addLongParagraph(content, 'Para1 sent1. Para1 sent2.')
      const para2Id = addLongParagraph(content, 'Para2 sent1. Para2 sent2.')
      const id2 = addParagraph(content, 'Regular paragraph')

      const segments: ContentSegment[] = [
        ...createSentenceSegments(para1Id, ['Para1 sent1.', 'Para1 sent2.'], 0),
        ...createSentenceSegments(para2Id, ['Para2 sent1.', 'Para2 sent2.'], 2),
        { id: id2, index: 4, label: 'Regular paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to second sentence paragraph
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: `${para2Id}:s0`,
      })

      // Para2 sentences should be visible
      await expect.element(page.getByText('Para2 sent1.')).toBeInTheDocument()
      await expect.element(page.getByText('Para2 sent2.')).toBeInTheDocument()

      // Para1 sentences should NOT be visible
      await expect.element(page.getByText('Para1 sent1.')).not.toBeInTheDocument()
      await expect.element(page.getByText('Para1 sent2.')).not.toBeInTheDocument()
    })

    it('does not show sentence paragraph on subsequent slides in single mode', async () => {
      const content = createContent()
      const longParaId = addLongParagraph(content, 'First sentence here. Second sentence here.')
      const id1 = addParagraph(content, 'Second paragraph')

      const segments: ContentSegment[] = [
        ...createSentenceSegments(longParaId, ['First sentence here.', 'Second sentence here.'], 0),
        { id: id1, index: 2, label: 'Second paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to the regular paragraph after the sentence paragraph
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id1,
      })

      // Only the current paragraph should be visible
      await expect.element(page.getByText('Second paragraph')).toBeInTheDocument()

      // Sentence content should NOT be visible
      await expect.element(page.getByText('First sentence here.')).not.toBeInTheDocument()
      await expect.element(page.getByText('Second sentence here.')).not.toBeInTheDocument()
    })

    it('does not show sentence paragraph on subsequent slides in block mode', async () => {
      const content = createContent()
      const longParaId = addLongParagraph(content, 'Block1 sentence one. Block1 sentence two.')
      addEmptyParagraph(content) // Block boundary
      const id1 = addParagraph(content, 'Block2 paragraph')

      const segments: ContentSegment[] = [
        ...createSentenceSegments(longParaId, ['Block1 sentence one.', 'Block1 sentence two.'], 0),
        { id: id1, index: 2, label: 'Block2 paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to the block 2 paragraph
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id1,
      })

      // Block 2 content should be visible
      await expect.element(page.getByText('Block2 paragraph')).toBeInTheDocument()

      // Block 1 sentence content should NOT be visible
      await expect.element(page.getByText('Block1 sentence one.')).not.toBeInTheDocument()
      await expect.element(page.getByText('Block1 sentence two.')).not.toBeInTheDocument()
    })

    it('skips paragraph when segment index is misaligned', async () => {
      // Test that a paragraph is skipped when its segment is missing from the array
      // This can happen if content was edited and segments weren't updated
      const content = createContent()
      const orphanParaId = addParagraph(content, 'Orphan paragraph without segment')
      const id1 = addParagraph(content, 'Regular paragraph')

      // Segments array is missing the first paragraph's segment
      const segments: ContentSegment[] = [
        { id: id1, index: 0, label: 'Regular paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id1,
      })

      // Regular paragraph should be visible
      await expect.element(page.getByText('Regular paragraph')).toBeInTheDocument()

      // Orphan paragraph should NOT be visible (segment mismatch)
      await expect.element(page.getByText('Orphan paragraph without segment')).not.toBeInTheDocument()
    })

    it('does not render paragraph using wrong segment visibility', async () => {
      // Test that a paragraph with missing sentence segments doesn't render
      // using a different paragraph's segment visibility
      const content = createContent()
      // First paragraph has a segmentId but no corresponding segments in the array
      addParagraph(content, 'First para with missing segments')
      const id1 = addParagraph(content, 'Second paragraph')

      // Only second paragraph has a segment entry
      const segments: ContentSegment[] = [
        { id: id1, index: 0, label: 'Second paragraph', type: 'paragraph', slideIndex: 0 },
      ]

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id1,
      })

      // Second paragraph should be visible
      await expect.element(page.getByText('Second paragraph')).toBeInTheDocument()

      // First paragraph should NOT be visible (it would incorrectly use second's visibility)
      await expect.element(page.getByText('First para with missing segments')).not.toBeInTheDocument()
    })

    it('uses logical segments for minimal mode pairing (sentence paragraph as one unit)', async () => {
      // This is the key test for the fix: a paragraph with 2 sentences should count
      // as ONE logical unit for pairing, not TWO.
      //
      // Expected slides:
      //   Slide 1: [1st Point] + [2nd Point with sentences]
      //   Slide 2: [3rd Point] + [4th Point]
      //
      // NOT:
      //   Slide 1: [1st Point] + [2nd Point sentence 1]
      //   Slide 2: [2nd Point sentence 2] + [3rd Point]  <-- WRONG!

      const content = createContent()
      const id0 = addParagraph(content, '1st Point')
      const longParaId = addLongParagraph(content, '2nd Point sent1. 2nd Point sent2.')
      const id2 = addParagraph(content, '3rd Point')
      const id3 = addParagraph(content, '4th Point')

      // Raw segment indices:
      // 0: 1st Point
      // 1: 2nd Point sentence 1
      // 2: 2nd Point sentence 2
      // 3: 3rd Point
      // 4: 4th Point
      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: '1st Point', type: 'paragraph', slideIndex: 0 },
        ...createSentenceSegments(longParaId, ['2nd Point sent1.', '2nd Point sent2.'], 1),
        { id: id2, index: 3, label: '3rd Point', type: 'paragraph', slideIndex: 0 },
        { id: id3, index: 4, label: '4th Point', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to 3rd Point - should show slide 2 (logical pair 1)
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: id2,
      })

      // Slide 2 should show 3rd Point and 4th Point
      await expect.element(page.getByText('3rd Point')).toBeInTheDocument()
      await expect.element(page.getByText('4th Point')).toBeInTheDocument()

      // Slide 2 should NOT show any content from slide 1
      await expect.element(page.getByText('1st Point')).not.toBeInTheDocument()
      await expect.element(page.getByText('2nd Point sent1.')).not.toBeInTheDocument()
      await expect.element(page.getByText('2nd Point sent2.')).not.toBeInTheDocument()
    })

    it('shows sentence paragraph on correct slide in minimal mode', async () => {
      // Complementary test: verify slide 1 shows the sentence paragraph correctly
      const content = createContent()
      const id0 = addParagraph(content, '1st Point')
      const longParaId = addLongParagraph(content, '2nd Point sent1. 2nd Point sent2.')
      const id2 = addParagraph(content, '3rd Point')
      const id3 = addParagraph(content, '4th Point')

      const segments: ContentSegment[] = [
        { id: id0, index: 0, label: '1st Point', type: 'paragraph', slideIndex: 0 },
        ...createSentenceSegments(longParaId, ['2nd Point sent1.', '2nd Point sent2.'], 1),
        { id: id2, index: 3, label: '3rd Point', type: 'paragraph', slideIndex: 0 },
        { id: id3, index: 4, label: '4th Point', type: 'paragraph', slideIndex: 0 },
      ]

      // Navigate to 1st Point - should show slide 1 (logical pair 0)
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: id0,
      })

      // Slide 1 should show 1st Point and ALL of 2nd Point (both sentences)
      await expect.element(page.getByText('1st Point')).toBeInTheDocument()
      await expect.element(page.getByText('2nd Point sent1.')).toBeInTheDocument()
      await expect.element(page.getByText('2nd Point sent2.')).toBeInTheDocument()

      // Slide 1 should NOT show slide 2 content
      await expect.element(page.getByText('3rd Point')).not.toBeInTheDocument()
      await expect.element(page.getByText('4th Point')).not.toBeInTheDocument()
    })
  })

  describe('inline images within paragraphs', () => {
    it('renders image-only paragraph in scrolling mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Text before image')
      const id1 = addImageParagraph(content, 'https://example.com/photo.jpg', 'A photo')
      const id2 = addParagraph(content, 'Text after image')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'scrolling',
        segments,
        currentSegmentId: id0,
      })

      // All segments should be visible in scrolling mode
      await expect.element(page.getByText('Text before image')).toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'A photo' })).toBeInTheDocument()
      await expect.element(page.getByText('Text after image')).toBeInTheDocument()
    })

    it('renders image paragraph in single mode when current', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Text paragraph')
      const id1 = addImageParagraph(content, 'https://example.com/photo.jpg', 'A photo')
      const id2 = addParagraph(content, 'Another text paragraph')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id1,
      })

      // Only image paragraph should be visible
      await expect.element(page.getByText('Text paragraph')).not.toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'A photo' })).toBeInTheDocument()
      await expect.element(page.getByText('Another text paragraph')).not.toBeInTheDocument()
    })

    it('hides image paragraph in single mode when not current', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Current text')
      const id1 = addImageParagraph(content, 'https://example.com/photo.jpg', 'Hidden photo')
      const id2 = addParagraph(content, 'Other text')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id0,
      })

      // Only current segment should be visible
      await expect.element(page.getByText('Current text')).toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'Hidden photo' })).not.toBeInTheDocument()
      await expect.element(page.getByText('Other text')).not.toBeInTheDocument()
    })

    it('renders image paragraph in minimal mode as part of current pair', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'First segment')
      const id1 = addImageParagraph(content, 'https://example.com/photo.jpg', 'Paired photo')
      const id2 = addParagraph(content, 'Third segment')
      const id3 = addParagraph(content, 'Fourth segment')

      const segments = createSegments([id0, id1, id2, id3])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'minimal',
        segments,
        currentSegmentId: id0, // First pair: id0 + id1
      })

      // First pair should be visible
      await expect.element(page.getByText('First segment')).toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'Paired photo' })).toBeInTheDocument()
      // Second pair should not
      await expect.element(page.getByText('Third segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Fourth segment')).not.toBeInTheDocument()
    })

    it('renders image paragraph in block mode within contiguous block', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Block 1 text')
      const id1 = addImageParagraph(content, 'https://example.com/photo.jpg', 'Block 1 photo')
      addEmptyParagraph(content) // Block boundary
      const id2 = addParagraph(content, 'Block 2 text')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'block',
        segments,
        currentSegmentId: id0,
      })

      // Block 1 should be visible (both text and image)
      await expect.element(page.getByText('Block 1 text')).toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'Block 1 photo' })).toBeInTheDocument()
      // Block 2 should not
      await expect.element(page.getByText('Block 2 text')).not.toBeInTheDocument()
    })

    it('renders image paragraph in maximal mode when on current slide', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'Segment A')
      const id1 = addImageParagraph(content, 'https://example.com/photo.jpg', 'Maximal photo')
      const id2 = addParagraph(content, 'Segment C')

      const segments = createSegments([id0, id1, id2])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'maximal',
        segments,
        currentSegmentId: id1,
      })

      // All segments on the same slide should be visible
      await expect.element(page.getByText('Segment A')).toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'Maximal photo' })).toBeInTheDocument()
      await expect.element(page.getByText('Segment C')).toBeInTheDocument()
    })

    it('does not misalign segments after image paragraph', async () => {
      // KEY TEST: image paragraphs must not consume extra segments and shift
      // all subsequent content out of alignment
      const content = createContent()
      const id0 = addParagraph(content, 'Before image')
      const id1 = addImageParagraph(content, 'https://example.com/photo.jpg', 'Middle image')
      const id2 = addParagraph(content, 'After image first')
      const id3 = addParagraph(content, 'After image second')

      const segments = createSegments([id0, id1, id2, id3])

      // Navigate to a text paragraph AFTER the image — if segments are misaligned,
      // the wrong content will appear
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id2,
      })

      // Only the targeted paragraph should be visible
      await expect.element(page.getByText('Before image')).not.toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'Middle image' })).not.toBeInTheDocument()
      await expect.element(page.getByText('After image first')).toBeInTheDocument()
      await expect.element(page.getByText('After image second')).not.toBeInTheDocument()
    })

    it('renders mixed text and image paragraph correctly', async () => {
      const content = createContent()
      const id0 = addParagraphWithInlineImage(
        content,
        'Look at this: ',
        'https://example.com/inline.jpg',
        'Inline pic',
        ' pretty cool',
      )
      const id1 = addParagraph(content, 'Next paragraph')

      const segments = createSegments([id0, id1])

      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id0,
      })

      // The mixed paragraph should render text and image together
      await expect.element(page.getByText('Look at this:')).toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'Inline pic' })).toBeInTheDocument()
      await expect.element(page.getByText('pretty cool')).toBeInTheDocument()
      // Next paragraph hidden
      await expect.element(page.getByText('Next paragraph')).not.toBeInTheDocument()
    })

    it('navigates correctly with multiple image paragraphs across formats', async () => {
      const content = createContent()
      const id0 = addImageParagraph(content, 'https://example.com/img1.jpg', 'Image one')
      const id1 = addParagraph(content, 'Middle text')
      const id2 = addImageParagraph(content, 'https://example.com/img2.jpg', 'Image two')
      const id3 = addParagraph(content, 'End text')

      const segments = createSegments([id0, id1, id2, id3])

      // Navigate to the second image paragraph in single mode
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'single',
        segments,
        currentSegmentId: id2,
      })

      // Only the second image should be visible
      await expect.element(page.getByRole('img', { name: 'Image one' })).not.toBeInTheDocument()
      await expect.element(page.getByText('Middle text')).not.toBeInTheDocument()
      await expect.element(page.getByRole('img', { name: 'Image two' })).toBeInTheDocument()
      await expect.element(page.getByText('End text')).not.toBeInTheDocument()
    })
  })
})
