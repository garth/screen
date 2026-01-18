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
        format: 'maximal',
        segments,
        currentSegmentId: id1, // Second segment is current
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
        format: 'maximal',
        segments,
        currentSegmentId: id1, // First segment in merge group
      })

      // Segment not in merge group should NOT be rendered
      await expect.element(page.getByText('Segment 0')).not.toBeInTheDocument()
      // Both segments in merge group should be rendered
      await expect.element(page.getByText('Segment 1')).toBeInTheDocument()
      await expect.element(page.getByText('Segment 2')).toBeInTheDocument()
      // Segment not in merge group should NOT be rendered
      await expect.element(page.getByText('Segment 3')).not.toBeInTheDocument()
    })
  })

  describe('scrolling mode in follow mode', () => {
    it('renders all segments', async () => {
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

      // All segments should be rendered in scrolling mode
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
  })

  describe('presenter mode (mode="present")', () => {
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

    it('renders exactly 1 segment on first render in maximal mode', async () => {
      const content = createContent()
      const id0 = addParagraph(content, 'First segment')
      const id1 = addParagraph(content, 'Second segment')
      const id2 = addParagraph(content, 'Third segment')
      const id3 = addParagraph(content, 'Fourth segment')

      const segments = createSegments([id0, id1, id2, id3])

      // First render with maximal mode and position at segment 2
      render(PresentationViewer, {
        content,
        theme: defaultTheme,
        mode: 'follow',
        format: 'maximal',
        segments,
        currentSegmentId: id2,
      })

      // Count visible segment elements
      const segmentElements = document.querySelectorAll('[data-segment-id]')
      expect(segmentElements.length).toBe(1)

      // Verify it's the correct segment
      await expect.element(page.getByText('First segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Second segment')).not.toBeInTheDocument()
      await expect.element(page.getByText('Third segment')).toBeInTheDocument()
      await expect.element(page.getByText('Fourth segment')).not.toBeInTheDocument()
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
})
