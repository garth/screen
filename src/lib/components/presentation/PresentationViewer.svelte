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
    } else if (format === 'maximal') {
      // Maximal mode: center the current segment
      segmentEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // Minimal mode: no scrolling needed, we hide other segments
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
    /** Set of segment IDs visible in minimal mode */
    minimalVisibleIds: Set<string>
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

    // Scrolling mode: all segments visible (just faded)
    if (ctx.format === 'scrolling') return true

    // Minimal mode: only show segments in current pair
    if (ctx.format === 'minimal') {
      return ctx.minimalVisibleIds.has(segment.id)
    }

    // Maximal mode: only show active segment (and its merge group)
    if (ctx.format === 'maximal') {
      return isSegmentActive(segment, ctx)
    }

    return true
  }

  /**
   * Wrap content in a segment div if we're in presenter mode
   */
  function wrapWithSegment(html: string, ctx: SegmentContext): string {
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

    return `<div class="${classes.join(' ')}" data-segment-index="${segment.index}" data-segment-id="${segment.id}">${html}</div>`
  }

  /**
   * Check if a paragraph/list-item should be split into sentence segments
   */
  function shouldSplitIntoSentences(ctx: SegmentContext, _elementType: string): boolean {
    if (!ctx.inPresenterMode || ctx.segments.length === 0) return false

    const segment = ctx.segments[ctx.segmentIndex]
    if (!segment) return false

    // Check if the next few segments are 'sentence' type from this element
    return segment.type === 'sentence'
  }

  /**
   * Render text content split into sentence segments
   */
  function renderSentenceSegments(_textHtml: string, ctx: SegmentContext): string {
    // Find all consecutive sentence segments
    let html = ''

    while (ctx.segmentIndex < ctx.segments.length && ctx.segments[ctx.segmentIndex].type === 'sentence') {
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

      html += `<span class="${classes.join(' ')}" data-segment-index="${segment.index}" data-segment-id="${segment.id}">${sentenceHtml}</span> `
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
          if (ctx && hasSegmentId && shouldSplitIntoSentences(ctx, 'paragraph')) {
            const sentenceHtml = renderSentenceSegments(children, ctx)
            return `<p>${sentenceHtml || '&nbsp;'}</p>`
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
          const children = buildChildren(ctx)
          const start = node.getAttribute('order')
          return start && start !== 1 ? `<ol start="${start}">${children}</ol>` : `<ol>${children}</ol>`
        }

        case 'list_item': {
          // Build children with insideListItem flag so nested paragraphs don't become segments
          const listItemCtx = ctx ? { ...ctx, insideListItem: true } : undefined
          const children = buildChildren(listItemCtx)

          // Check if this list item should be split into sentence segments
          if (ctx && hasSegmentId && shouldSplitIntoSentences(ctx, 'list-item')) {
            const sentenceHtml = renderSentenceSegments(children, ctx)
            return `<li>${sentenceHtml}</li>`
          }
          const html = `<li>${children}</li>`
          return ctx && hasSegmentId ? wrapWithSegment(html, ctx) : html
        }

        case 'image': {
          const src = node.getAttribute('src') || ''
          const alt = node.getAttribute('alt') || ''
          const title = node.getAttribute('title') || ''
          const html = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" title="${escapeHtml(title)}" />`
          // Images always have segment IDs (they can't be empty)
          return ctx ? wrapWithSegment(html, ctx) : html
        }

        case 'slide_divider':
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
      const pairIdx = Math.floor(Math.max(0, segIdx) / 2)

      // Compute minimal visible IDs inline
      const minimalIds = new Set<string>()
      if (_format === 'minimal') {
        const startIdx = pairIdx * 2
        if (_segments[startIdx]) minimalIds.add(_segments[startIdx].id)
        if (_segments[startIdx + 1]) minimalIds.add(_segments[startIdx + 1].id)
      }

      // Find the merge group ID if the current segment is part of a merge group
      const currentSegment = _currentSegmentId ? _segments.find((s) => s.id === _currentSegmentId) : null
      const activeMergeGroupId = currentSegment?.mergeGroupId ?? null

      const ctx: SegmentContext = {
        segments: _segments,
        segmentIndex: 0,
        currentSegmentId: _currentSegmentId,
        currentSegmentIndex: segIdx,
        activeMergeGroupId,
        inPresenterMode: true,
        insideListItem: false,
        format: _format,
        minimalVisibleIds: minimalIds,
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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={viewerElement}
  class="presentation-viewer h-full w-full overflow-auto"
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
