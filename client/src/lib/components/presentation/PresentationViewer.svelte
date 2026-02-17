<script lang="ts">
  import * as Y from 'yjs'
  import type { ResolvedTheme } from '$lib/utils/theme-resolver'
  import type { ContentSegment } from '$lib/utils/segment-parser'
  import type { PresentationFormat } from '$lib/stores/documents/types'

  interface Props {
    content: Y.XmlFragment | null
    theme: ResolvedTheme
    mode?: 'view' | 'present' | 'follow'
    format?: PresentationFormat
    segments?: ContentSegment[]
    currentSegmentId?: string | null
    onSegmentClick?: (segmentId: string) => void
  }

  let {
    content,
    theme,
    mode = 'view',
    format = 'scrolling',
    segments = [],
    currentSegmentId = null,
    onSegmentClick,
  }: Props = $props()

  let viewerElement: HTMLElement | null = $state(null)

  // Scroll current segment into view when it changes
  $effect(() => {
    if (mode === 'view' || !viewerElement || !currentSegmentId) return

    const segmentEl = viewerElement.querySelector(`[data-segment-id="${currentSegmentId}"]`)
    if (!segmentEl) return

    if (format === 'scrolling') {
      // Scrolling mode: position current segment near top (~20% from top)
      const containerRect = viewerElement.getBoundingClientRect()
      const elementRect = segmentEl.getBoundingClientRect()
      const offsetTop = elementRect.top - containerRect.top + viewerElement.scrollTop
      const targetScroll = offsetTop - containerRect.height * 0.2
      viewerElement.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
    } else {
      // All other modes: center the current segment
      segmentEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })

  /**
   * Escape HTML special characters
   */
  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  /**
   * Context for tracking segments during HTML rendering
   */
  interface SegmentContext {
    segments: ContentSegment[]
    segmentIndex: number
    currentSegmentId: string | null
    currentSegmentIndex: number
    /** The merge group ID that should be highlighted (if current segment is in a merge group) */
    activeMergeGroupId: string | null
    inPresenterMode: boolean
    /** Track if we're inside a list_item (paragraphs inside shouldn't be segments) */
    insideListItem: boolean
    /** Format mode for display */
    format: PresentationFormat
    /** Set of segment IDs visible in single mode (current + merge group) */
    singleVisibleIds: Set<string>
    /** Set of segment IDs visible in minimal mode */
    minimalVisibleIds: Set<string>
    /** Set of segment IDs visible in block mode (contiguous content block) */
    blockVisibleIds: Set<string>
    /** Set of segment IDs visible in maximal mode (all segments on current slide) */
    maximalVisibleIds: Set<string>
    /** Set of segment IDs visible in scrolling mode (same slideIndex as current) */
    scrollingVisibleIds: Set<string>
    /** Ordinal value for the current list item inside an ordered_list (1-based) */
    orderedListItemValue: number | null
    /** Whether to apply format display effects (hiding/fading) - only true in follow mode */
    applyFormatEffects: boolean
    /** Track if we've rendered at least one visible segment */
    hasRenderedVisible: boolean
    /** Track if we've finished the visible range (hit non-visible after visible) */
    hasFinishedVisible: boolean
  }

  /**
   * Check if a segment should be highlighted (either directly active or part of active merge group)
   */
  function isSegmentActive(segment: ContentSegment, ctx: SegmentContext): boolean {
    // Direct match
    if (segment.id === ctx.currentSegmentId) return true
    // Part of active merge group
    if (ctx.activeMergeGroupId && segment.mergeGroupId === ctx.activeMergeGroupId) return true
    return false
  }

  /**
   * Check if a segment should be visible (not hidden by format mode)
   */
  function isSegmentVisible(segment: ContentSegment, ctx: SegmentContext): boolean {
    // All segments visible if not in follow mode
    if (!ctx.applyFormatEffects) return true

    // Scrolling mode: only segments on the current slide are visible
    if (ctx.format === 'scrolling') {
      return ctx.scrollingVisibleIds.has(segment.id)
    }

    // Single mode: only show current segment (and its merge group)
    if (ctx.format === 'single') {
      return ctx.singleVisibleIds.has(segment.id)
    }

    // Minimal mode: only show segments in current pair
    if (ctx.format === 'minimal') {
      return ctx.minimalVisibleIds.has(segment.id)
    }

    // Block mode: show all segments in the current contiguous block
    if (ctx.format === 'block') {
      return ctx.blockVisibleIds.has(segment.id)
    }

    // Maximal mode: show all segments on the current slide
    if (ctx.format === 'maximal') {
      return ctx.maximalVisibleIds.has(segment.id)
    }

    return true
  }

  /**
   * Wrap content in a segment element if we're in presenter mode.
   * Uses the specified tag (default 'div') — use 'li' for list items
   * to keep valid HTML inside <ol>/<ul>.
   */
  function wrapWithSegment(html: string, ctx: SegmentContext, tag = 'div', extraAttrs = ''): string {
    if (!ctx.inPresenterMode || ctx.segments.length === 0) return html

    const segment = ctx.segments[ctx.segmentIndex]
    if (!segment) return html

    const segmentIdx = ctx.segmentIndex
    ctx.segmentIndex++

    // Check if segment is visible and track state
    const visible = isSegmentVisible(segment, ctx)
    if (visible) {
      ctx.hasRenderedVisible = true
    } else if (ctx.hasRenderedVisible) {
      ctx.hasFinishedVisible = true
    }

    // Skip rendering if segment is not visible
    if (!visible) {
      return ''
    }

    const isActive = isSegmentActive(segment, ctx)

    // Build CSS classes
    const classes = ['segment']
    if (isActive) classes.push('segment-active')

    // Scrolling mode: add fade class for segments above current
    if (ctx.applyFormatEffects && ctx.format === 'scrolling' && segmentIdx < ctx.currentSegmentIndex) {
      classes.push('segment-faded')
    }

    const interactive = onSegmentClick ? ' tabindex="0" role="button"' : ''
    return `<${tag} class="${classes.join(' ')}" data-segment-index="${segment.index}" data-segment-id="${segment.id}"${interactive}${extraAttrs}>${html}</${tag}>`
  }

  /**
   * Check if a paragraph/list-item should be split into sentence segments
   */
  function shouldSplitIntoSentences(ctx: SegmentContext, elementSegmentId: string | null): boolean {
    if (!ctx.inPresenterMode || ctx.segments.length === 0) return false

    const segment = ctx.segments[ctx.segmentIndex]
    if (!segment) return false

    // Check if the segment is a sentence AND belongs to this element
    // The sentence's parentSegmentId must match the DOM element's segmentId
    return segment.type === 'sentence' && segment.parentSegmentId === elementSegmentId
  }

  /**
   * Render text content split into sentence segments
   */
  function renderSentenceSegments(_textHtml: string, ctx: SegmentContext): string {
    // Find all consecutive sentence segments from the same parent paragraph
    let html = ''

    // Get the parent paragraph ID from the first sentence to scope to this paragraph
    const firstSentence = ctx.segments[ctx.segmentIndex]
    const parentId = firstSentence?.parentSegmentId

    while (
      ctx.segmentIndex < ctx.segments.length &&
      ctx.segments[ctx.segmentIndex].type === 'sentence' &&
      ctx.segments[ctx.segmentIndex].parentSegmentId === parentId
    ) {
      const segment = ctx.segments[ctx.segmentIndex]
      const segmentIdx = ctx.segmentIndex
      ctx.segmentIndex++

      // Check if segment is visible and track state
      const visible = isSegmentVisible(segment, ctx)
      if (visible) {
        ctx.hasRenderedVisible = true
      } else if (ctx.hasRenderedVisible) {
        ctx.hasFinishedVisible = true
      }

      // Skip rendering if segment is not visible
      if (!visible) {
        continue
      }

      const isActive = isSegmentActive(segment, ctx)

      // Build CSS classes
      const classes = ['segment']
      if (isActive) classes.push('segment-active')

      // Scrolling mode: add fade class for segments above current
      if (ctx.applyFormatEffects && ctx.format === 'scrolling' && segmentIdx < ctx.currentSegmentIndex) {
        classes.push('segment-faded')
      }

      // Use sentenceText for full sentence (label may be truncated), fall back to label
      const sentenceHtml = escapeHtml(segment.sentenceText || segment.label)

      const interactive = onSegmentClick ? ' tabindex="0" role="button"' : ''
      html += `<span class="${classes.join(' ')}" data-segment-index="${segment.index}" data-segment-id="${segment.id}"${interactive}>${sentenceHtml}</span> `
    }

    return html.trim()
  }

  /**
   * Extract plain text from XmlElement for matching sentences
   */
  function _extractPlainText(element: Y.XmlElement | Y.XmlText): string {
    if (element instanceof Y.XmlText) {
      return element.toString()
    }
    let text = ''
    element.forEach((child) => {
      if (child instanceof Y.XmlText) {
        text += child.toString()
      } else if (child instanceof Y.XmlElement) {
        text += _extractPlainText(child)
      }
    })
    return text
  }

  /**
   * Convert XmlFragment/XmlElement to HTML string
   */
  function xmlToHtml(node: Y.XmlFragment | Y.XmlElement | Y.XmlText | string, ctx?: SegmentContext): string {
    // Handle string content
    if (typeof node === 'string') {
      return escapeHtml(node)
    }

    // Handle XmlText
    if (node instanceof Y.XmlText) {
      let html = ''
      const delta = node.toDelta()

      for (const op of delta) {
        if (typeof op.insert === 'string') {
          let text = escapeHtml(op.insert)

          // Apply formatting marks
          if (op.attributes) {
            if (op.attributes.strong) text = `<strong>${text}</strong>`
            if (op.attributes.em) text = `<em>${text}</em>`
            if (op.attributes.underline) text = `<u>${text}</u>`
            if (op.attributes.strikethrough) text = `<s>${text}</s>`
            if (op.attributes.code) text = `<code>${text}</code>`
            if (op.attributes.link) {
              const href = escapeHtml(op.attributes.link.href || '')
              text = `<a href="${href}" target="_blank" rel="noopener">${text}</a>`
            }
          }

          html += text
        }
      }

      return html
    }

    // Handle XmlElement
    if (node instanceof Y.XmlElement) {
      const tagName = node.nodeName.toLowerCase()

      // Helper to build children with current context
      const buildChildren = (childCtx?: SegmentContext): string => {
        let result = ''
        node.forEach((child) => {
          result += xmlToHtml(child as Y.XmlElement | Y.XmlText | string, childCtx)
        })
        return result
      }

      // Check if this element has a segment ID (empty elements won't have one)
      const hasSegmentId = node.getAttribute('segmentId') != null

      // In follow mode with format effects, skip elements without segmentIds
      // only if they're before the first visible segment or after the last visible segment
      const shouldSkipNonSegment =
        ctx?.applyFormatEffects && !hasSegmentId && (!ctx.hasRenderedVisible || ctx.hasFinishedVisible)

      switch (tagName) {
        case 'paragraph': {
          // Skip empty paragraphs outside the visible range
          if (shouldSkipNonSegment && !ctx?.insideListItem) {
            return ''
          }
          const children = buildChildren(ctx)
          // Skip wrapping paragraphs inside list items - the list_item is the segment
          if (ctx?.insideListItem) {
            return `<p>${children || '&nbsp;'}</p>`
          }
          // Check if this paragraph should be split into sentence segments
          const elementSegmentId = node.getAttribute('segmentId') as string | null
          if (ctx && hasSegmentId && shouldSplitIntoSentences(ctx, elementSegmentId)) {
            const sentenceHtml = renderSentenceSegments(children, ctx)
            // Skip paragraph entirely if no sentences are visible
            if (!sentenceHtml) {
              return ''
            }
            return `<p>${sentenceHtml}</p>`
          }
          // For non-sentence-split paragraphs, verify segment matches before rendering
          if (ctx && hasSegmentId) {
            const segment = ctx.segments[ctx.segmentIndex]
            // Skip if segment doesn't match this element (index misalignment)
            if (!segment || segment.id !== elementSegmentId) {
              return ''
            }
          }
          const html = `<p>${children || '&nbsp;'}</p>`
          return ctx && hasSegmentId ? wrapWithSegment(html, ctx) : html
        }

        case 'heading': {
          // Skip empty headings in follow mode with format effects
          if (shouldSkipNonSegment) {
            return ''
          }
          const children = buildChildren(ctx)
          const level = node.getAttribute('level') || 1
          const html = `<h${level}>${children}</h${level}>`
          return ctx && hasSegmentId ? wrapWithSegment(html, ctx) : html
        }

        case 'bullet_list': {
          const children = buildChildren(ctx)
          return `<ul>${children}</ul>`
        }

        case 'ordered_list': {
          let startOrder = node.getAttribute('order') || 1
          if (typeof startOrder === 'string') startOrder = parseInt(startOrder, 10) || 1

          // Build children manually so we can set orderedListItemValue on each
          let olHtml = ''
          let itemPosition = 0
          node.forEach((child) => {
            if (ctx && child instanceof Y.XmlElement && child.nodeName.toLowerCase() === 'list_item') {
              ctx.orderedListItemValue = startOrder + itemPosition
              olHtml += xmlToHtml(child, ctx)
              ctx.orderedListItemValue = null
              itemPosition++
            } else {
              olHtml += xmlToHtml(child as Y.XmlElement | Y.XmlText | string, ctx)
            }
          })
          return `<ol>${olHtml}</ol>`
        }

        case 'list_item': {
          // Build children with insideListItem flag so nested paragraphs don't become segments
          const listItemCtx = ctx ? { ...ctx, insideListItem: true } : undefined
          const children = buildChildren(listItemCtx)

          // Check if this list item should be split into sentence segments
          const listItemSegmentId = node.getAttribute('segmentId') as string | null
          const valueAttr = ctx?.orderedListItemValue != null ? ` value="${ctx.orderedListItemValue}"` : ''
          if (ctx && hasSegmentId && shouldSplitIntoSentences(ctx, listItemSegmentId)) {
            const sentenceHtml = renderSentenceSegments(children, ctx)
            return `<li${valueAttr}>${sentenceHtml}</li>`
          }
          // Use 'li' tag for segment wrapper to keep valid HTML inside <ol>/<ul>
          return ctx && hasSegmentId ?
              wrapWithSegment(children, ctx, 'li', valueAttr)
            : `<li${valueAttr}>${children}</li>`
        }

        case 'image': {
          const src = node.getAttribute('src') || ''
          const alt = node.getAttribute('alt') || ''
          const title = node.getAttribute('title') || ''
          const html = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" title="${escapeHtml(title)}" />`
          // Images are inline within paragraphs — the paragraph's wrapWithSegment
          // already handles segment wrapping. Don't consume a segment here or it
          // misaligns all subsequent segments.
          return html
        }

        case 'slide_divider':
          if (ctx?.applyFormatEffects) {
            return ''
          }
          return `<hr class="slide-divider" data-slide-divider="true" />`

        case 'blockquote': {
          // Skip empty blockquotes in follow mode with format effects
          if (shouldSkipNonSegment) {
            return ''
          }
          const children = buildChildren(ctx)
          const html = `<blockquote>${children}</blockquote>`
          return ctx && hasSegmentId ? wrapWithSegment(html, ctx) : html
        }

        case 'attribution': {
          const children = buildChildren(ctx)
          return `<cite>${children}</cite>`
        }

        case 'hard_break':
          return '<br />'

        default: {
          // For any unknown elements, just return children
          const children = buildChildren(ctx)
          return children
        }
      }
    }

    // Handle XmlFragment (root)
    if (node instanceof Y.XmlFragment) {
      let html = ''
      node.forEach((child) => {
        html += xmlToHtml(child as Y.XmlElement | Y.XmlText | string, ctx)
      })
      return html
    }

    return ''
  }

  /**
   * Check if a content node is an empty block (virtual slide divider candidate).
   * Empty blocks have no text content and no segmentId.
   */
  function isEmptyBlock(node: Y.XmlElement): boolean {
    // Check if it has a segmentId - nodes with segmentIds are not empty
    if (node.getAttribute('segmentId') != null) return false

    // Check if it has any text content
    let hasContent = false
    node.forEach((child) => {
      if (child instanceof Y.XmlText && child.toString().trim()) {
        hasContent = true
      } else if (child instanceof Y.XmlElement) {
        // Recursively check children (e.g., paragraph inside list_item)
        if (!isEmptyBlock(child)) {
          hasContent = true
        }
      }
    })
    return !hasContent
  }

  /**
   * Analyze content structure to find block boundaries.
   * Returns an array of block indices for each segment, where segments in the same
   * contiguous block share the same block index. Empty blocks and slide_dividers
   * create boundaries between blocks.
   */
  function computeBlockBoundaries(content: Y.XmlFragment, segments: ContentSegment[]): Map<string, number> {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- function-local, not reactive state
    const segmentToBlock = new Map<string, number>()
    let currentBlockIndex = 0
    let lastWasEmpty = true // Start as true to handle leading empty blocks

    content.forEach((child) => {
      if (!(child instanceof Y.XmlElement)) return

      const tagName = child.nodeName.toLowerCase()

      // Slide dividers always create a boundary
      if (tagName === 'slide_divider') {
        currentBlockIndex++
        lastWasEmpty = true
        return
      }

      // Check if this is an empty block (virtual slide divider)
      const isEmpty = isEmptyBlock(child)
      const segmentId = child.getAttribute('segmentId')

      if (isEmpty) {
        // Empty block: if we had content before, start a new block
        if (!lastWasEmpty) {
          currentBlockIndex++
        }
        lastWasEmpty = true
        return
      }

      // Non-empty block: assign segments to current block
      lastWasEmpty = false

      // Handle list elements (they contain list_items which are the segments)
      if (tagName === 'bullet_list' || tagName === 'ordered_list') {
        child.forEach((listItem) => {
          if (listItem instanceof Y.XmlElement) {
            const segmentId = listItem.getAttribute('segmentId')
            // Only use first occurrence of each segmentId (handles duplicate IDs defensively)
            if (segmentId && !segmentToBlock.has(segmentId)) {
              segmentToBlock.set(segmentId, currentBlockIndex)
            }
          }
        })
      } else {
        // Check for segment on this element
        // Only use first occurrence of each segmentId (handles duplicate IDs defensively)
        if (segmentId && !segmentToBlock.has(segmentId)) {
          segmentToBlock.set(segmentId, currentBlockIndex)
        }
      }
    })

    // Assign sentence segments to their parent's block
    // Sentence segments have parentSegmentId pointing to the paragraph they belong to
    for (const segment of segments) {
      if (segment.parentSegmentId) {
        const parentBlock = segmentToBlock.get(segment.parentSegmentId)
        if (parentBlock !== undefined) {
          segmentToBlock.set(segment.id, parentBlock)
        }
      }
    }

    return segmentToBlock
  }

  // Compute HTML content - must be a function that reruns when props change
  function computeHtmlContent(
    _content: Y.XmlFragment | null,
    _mode: 'view' | 'present' | 'follow',
    _format: PresentationFormat,
    _segments: ContentSegment[],
    _currentSegmentId: string | null,
  ): string {
    if (!_content) return ''

    // Create segment context when in present or follow mode with segments
    if ((_mode === 'present' || _mode === 'follow') && _segments.length > 0) {
      // Compute segment index and pair inline to ensure freshness
      const segIdx = _currentSegmentId ? _segments.findIndex((s) => s.id === _currentSegmentId) : -1

      // Find the merge group ID if the current segment is part of a merge group
      const currentSegment = _currentSegmentId ? _segments.find((s) => s.id === _currentSegmentId) : null
      const activeMergeGroupId = currentSegment?.mergeGroupId ?? null

      // For sentence segments, use first sentence's index for slide/pair computation
      // This keeps all sentences from the same paragraph on the same slide
      let effectiveSegIdx = segIdx
      if (currentSegment?.parentSegmentId) {
        // Find first sibling sentence (lowest index with same parentSegmentId)
        const firstSibling = _segments.find((s) => s.parentSegmentId === currentSegment.parentSegmentId)
        if (firstSibling) {
          effectiveSegIdx = _segments.findIndex((s) => s.id === firstSibling.id)
        }
      }

      // Use effectiveSegIdx for pair calculation
      const _pairIdx = Math.floor(Math.max(0, effectiveSegIdx) / 2)

      // Helper: get all sibling sentence IDs from the same paragraph
      function getSiblingSentenceIds(segment: ContentSegment): string[] {
        const parentId = segment.parentSegmentId
        if (!parentId) return []
        return _segments.filter((s) => s.parentSegmentId === parentId).map((s) => s.id)
      }

      // Compute single visible IDs (current segment + merge group members + sibling sentences)
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- function-local, not reactive state
      const singleIds = new Set<string>()
      if (_format === 'single') {
        if (currentSegment) {
          singleIds.add(currentSegment.id)
          // Add sibling sentences from same paragraph
          for (const id of getSiblingSentenceIds(currentSegment)) {
            singleIds.add(id)
          }
          // Add all segments in the same merge group
          if (activeMergeGroupId) {
            for (const seg of _segments) {
              if (seg.mergeGroupId === activeMergeGroupId) {
                singleIds.add(seg.id)
              }
            }
          }
        }
      }

      // Compute minimal visible IDs using "logical segments" where sentence-split
      // paragraphs count as one unit. This ensures a paragraph with multiple sentences
      // doesn't span across slides.
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- function-local, not reactive state
      const minimalIds = new Set<string>()
      if (_format === 'minimal') {
        // Build list of logical segments (first sentence of each paragraph, or regular segments)
        const logicalSegments: ContentSegment[] = []
        // eslint-disable-next-line svelte/prefer-svelte-reactivity -- function-local, not reactive state
        const seenParentIds = new Set<string>()
        for (const segment of _segments) {
          if (segment.parentSegmentId) {
            // Sentence segment - only include if first of its parent
            if (!seenParentIds.has(segment.parentSegmentId)) {
              seenParentIds.add(segment.parentSegmentId)
              logicalSegments.push(segment)
            }
          } else {
            // Regular segment
            logicalSegments.push(segment)
          }
        }

        // Compute logical index for current segment
        let logicalIdx = 0
        if (currentSegment?.parentSegmentId) {
          // For sentence, find the logical index of its first sibling
          const firstSibling = _segments.find((s) => s.parentSegmentId === currentSegment.parentSegmentId)
          if (firstSibling) {
            logicalIdx = logicalSegments.findIndex((s) => s.id === firstSibling.id)
          }
        } else if (currentSegment) {
          logicalIdx = logicalSegments.findIndex((s) => s.id === currentSegment.id)
        }

        // Compute pair index based on logical index
        const logicalPairIdx = Math.floor(Math.max(0, logicalIdx) / 2)
        const logicalStartIdx = logicalPairIdx * 2

        // Get the 2 logical segments for this pair
        const logicalSeg0 = logicalSegments[logicalStartIdx]
        const logicalSeg1 = logicalSegments[logicalStartIdx + 1]

        // Add all segments (including sibling sentences) for these logical segments
        if (logicalSeg0) {
          minimalIds.add(logicalSeg0.id)
          for (const id of getSiblingSentenceIds(logicalSeg0)) {
            minimalIds.add(id)
          }
        }
        if (logicalSeg1) {
          minimalIds.add(logicalSeg1.id)
          for (const id of getSiblingSentenceIds(logicalSeg1)) {
            minimalIds.add(id)
          }
        }
      }

      // Compute block visible IDs (all segments in current contiguous block)
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- function-local, not reactive state
      const blockIds = new Set<string>()
      if (_format === 'block') {
        const blockBoundaries = computeBlockBoundaries(_content, _segments)
        const currentBlockIndex = currentSegment ? blockBoundaries.get(currentSegment.id) : undefined
        if (currentBlockIndex !== undefined) {
          for (const seg of _segments) {
            if (blockBoundaries.get(seg.id) === currentBlockIndex) {
              blockIds.add(seg.id)
            }
          }
        }
      }

      // Compute scrolling visible IDs (all segments on the same slide as current)
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- function-local, not reactive state
      const scrollingIds = new Set<string>()
      if (_format === 'scrolling') {
        const currentSlideIndex = currentSegment?.slideIndex ?? 0
        for (const seg of _segments) {
          if (seg.slideIndex === currentSlideIndex) {
            scrollingIds.add(seg.id)
          }
        }
      }

      // Compute maximal visible IDs (all segments on the current slide)
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- function-local, not reactive state
      const maximalIds = new Set<string>()
      if (_format === 'maximal') {
        const currentSlideIndex = currentSegment?.slideIndex ?? 0
        for (const seg of _segments) {
          if (seg.slideIndex === currentSlideIndex) {
            maximalIds.add(seg.id)
          }
        }
      }

      const ctx: SegmentContext = {
        segments: _segments,
        segmentIndex: 0,
        currentSegmentId: _currentSegmentId,
        currentSegmentIndex: segIdx,
        activeMergeGroupId,
        inPresenterMode: true,
        insideListItem: false,
        format: _format,
        singleVisibleIds: singleIds,
        minimalVisibleIds: minimalIds,
        blockVisibleIds: blockIds,
        maximalVisibleIds: maximalIds,
        scrollingVisibleIds: scrollingIds,
        orderedListItemValue: null,
        applyFormatEffects: _mode === 'follow',
        hasRenderedVisible: false,
        hasFinishedVisible: false,
      }
      return xmlToHtml(_content, ctx)
    }

    return xmlToHtml(_content)
  }

  // Use $derived with explicit prop access to ensure reactivity
  const htmlContent = $derived(computeHtmlContent(content, mode, format, segments, currentSegmentId))
</script>

<div
  bind:this={viewerElement}
  class="presentation-viewer h-full w-full overflow-auto"
  role={onSegmentClick ? 'region' : undefined}
  aria-label={onSegmentClick ? 'Presentation content' : undefined}
  aria-live="polite"
  style:font-family={theme.font}
  style:background-color={theme.backgroundColor}
  style:color={theme.textColor}
  onclick={(e) => {
    if (!onSegmentClick) return
    const target = (e.target as HTMLElement).closest('[data-segment-id]')
    if (target) {
      const segmentId = target.getAttribute('data-segment-id')
      if (segmentId) {
        onSegmentClick(segmentId)
      }
    }
  }}
  onkeydown={(e) => {
    if (!onSegmentClick || (e.key !== 'Enter' && e.key !== ' ')) return
    const target = (e.target as HTMLElement).closest('[data-segment-id]')
    if (target) {
      e.preventDefault()
      const segmentId = target.getAttribute('data-segment-id')
      if (segmentId) {
        onSegmentClick(segmentId)
      }
    }
  }}>
  {#if theme.viewport}
    <div
      class="viewport-container relative mx-auto"
      style:width="{theme.viewport.width}px"
      style:max-width="100%"
      style:aspect-ratio="{theme.viewport.width} / {theme.viewport.height}">
      <div class="prose max-w-none p-8" style:color={theme.textColor}>
        {#if htmlContent}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- Rendering presentation content requires HTML -->
          {@html htmlContent}
        {:else}
          <p class="text-center opacity-50">No content yet</p>
        {/if}
      </div>
    </div>
  {:else}
    <div class="prose max-w-none p-8" style:color={theme.textColor}>
      {#if htmlContent}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- Rendering presentation content requires HTML -->
        {@html htmlContent}
      {:else}
        <p class="text-center opacity-50">No content yet</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Segment highlighting */
  .presentation-viewer :global(.segment) {
    transition:
      background-color 0.2s ease,
      outline-color 0.2s ease,
      opacity 0.3s ease;
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    margin: -0.125rem -0.25rem;
  }

  .presentation-viewer :global(.segment-active) {
    background-color: rgba(59, 130, 246, 0.15);
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 2px;
  }

  /* Faded segments (scrolling mode - segments above current) */
  .presentation-viewer :global(.segment-faded) {
    opacity: 0.4;
  }

  /* List item segments (keep list layout intact) */
  .presentation-viewer :global(li.segment) {
    margin: 0;
  }

  /* Sentence segments (inline spans) */
  .presentation-viewer :global(span.segment) {
    display: inline;
    padding: 0.0625rem 0.125rem;
    margin: 0;
  }

  .presentation-viewer :global(span.segment-active) {
    background-color: rgba(59, 130, 246, 0.2);
    outline: 1px solid rgba(59, 130, 246, 0.4);
    outline-offset: 1px;
  }

  /* Faded sentence segments (scrolling mode) */
  .presentation-viewer :global(span.segment-faded) {
    opacity: 0.4;
  }

  /* Headings */
  .presentation-viewer :global(h1) {
    font-size: 2.5rem;
    font-weight: bold;
    margin: 0;
  }

  .presentation-viewer :global(h2) {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
  }

  .presentation-viewer :global(h3) {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0;
  }

  /* Paragraph */
  .presentation-viewer :global(p) {
    margin: 0;
    line-height: 1.6;
    min-height: 1.6em;
  }

  /* Lists */
  .presentation-viewer :global(ul) {
    margin: 0;
    padding-left: 2rem;
    list-style-type: disc;
  }

  .presentation-viewer :global(ol) {
    margin: 0;
    padding-left: 2rem;
    list-style-type: decimal;
  }

  .presentation-viewer :global(li) {
    margin: 0;
  }

  .presentation-viewer :global(li p) {
    margin: 0;
  }

  /* Nested lists */
  .presentation-viewer :global(ul ul),
  .presentation-viewer :global(ol ul) {
    list-style-type: circle;
  }

  .presentation-viewer :global(ul ul ul),
  .presentation-viewer :global(ol ul ul) {
    list-style-type: square;
  }

  /* Images */
  .presentation-viewer :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.25rem;
    margin: 1rem 0;
  }

  /* Slide divider */
  .presentation-viewer :global(hr.slide-divider) {
    border: none;
    border-top: 3px dashed currentColor;
    opacity: 0.3;
    margin: 2rem 0;
  }

  /* Blockquote */
  .presentation-viewer :global(blockquote) {
    border-left: 4px solid currentColor;
    opacity: 0.9;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
  }

  .presentation-viewer :global(blockquote p) {
    margin: 0;
  }

  /* Attribution */
  .presentation-viewer :global(cite) {
    display: block;
    font-size: 0.875rem;
    opacity: 0.7;
    margin-top: 0.5rem;
    font-style: normal;
  }

  .presentation-viewer :global(cite::before) {
    content: '— ';
  }

  /* Inline formatting */
  .presentation-viewer :global(strong) {
    font-weight: bold;
  }

  .presentation-viewer :global(em) {
    font-style: italic;
  }

  .presentation-viewer :global(u) {
    text-decoration: underline;
  }

  .presentation-viewer :global(s) {
    text-decoration: line-through;
  }

  .presentation-viewer :global(code) {
    /* Use currentColor with low opacity for theme-aware background */
    background-color: color-mix(in srgb, currentColor 10%, transparent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, monospace;
    font-size: 0.875em;
  }

  /* Links - use currentColor with opacity for theme compatibility */
  .presentation-viewer :global(a) {
    color: inherit;
    opacity: 0.8;
    text-decoration: underline;
  }

  .presentation-viewer :global(a:hover) {
    opacity: 1;
  }
</style>
