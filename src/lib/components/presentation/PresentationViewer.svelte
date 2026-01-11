<script lang="ts">
  import * as Y from 'yjs'
  import type { ResolvedTheme } from '$lib/utils/theme-resolver'
  import type { ContentSegment } from '$lib/utils/segment-parser'

  interface Props {
    content: Y.XmlFragment | null
    theme: ResolvedTheme
    mode?: 'view' | 'present'
    segments?: ContentSegment[]
    currentSegmentId?: string | null
    onSegmentClick?: (segmentId: string) => void
  }

  let { content, theme, mode = 'view', segments = [], currentSegmentId = null, onSegmentClick }: Props = $props()

  let viewerElement: HTMLElement | null = $state(null)

  // Scroll current segment into view when it changes
  $effect(() => {
    if (mode !== 'present' || !viewerElement || !currentSegmentId) return

    const segmentEl = viewerElement.querySelector(`[data-segment-id="${currentSegmentId}"]`)
    if (segmentEl) {
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
    inPresenterMode: boolean
  }

  /**
   * Wrap content in a segment div if we're in presenter mode
   */
  function wrapWithSegment(html: string, ctx: SegmentContext): string {
    if (!ctx.inPresenterMode || ctx.segments.length === 0) return html

    const segment = ctx.segments[ctx.segmentIndex]
    if (!segment) return html

    const isActive = segment.id === ctx.currentSegmentId
    const activeClass = isActive ? ' segment-active' : ''
    ctx.segmentIndex++

    return `<div class="segment${activeClass}" data-segment-index="${segment.index}" data-segment-id="${segment.id}">${html}</div>`
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
      const isActive = segment.id === ctx.currentSegmentId
      const activeClass = isActive ? ' segment-active' : ''

      // Get the sentence text from the segment label (it contains the actual sentence)
      const sentenceHtml = escapeHtml(segment.label)

      html += `<span class="segment${activeClass}" data-segment-index="${segment.index}" data-segment-id="${segment.id}">${sentenceHtml}</span> `
      ctx.segmentIndex++
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
        text += extractPlainText(child)
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

      // Build children HTML, passing context through
      let children = ''
      node.forEach((child) => {
        children += xmlToHtml(child as Y.XmlElement | Y.XmlText | string, ctx)
      })

      switch (tagName) {
        case 'paragraph': {
          // Check if this paragraph should be split into sentence segments
          if (ctx && shouldSplitIntoSentences(ctx, 'paragraph')) {
            const sentenceHtml = renderSentenceSegments(children, ctx)
            return `<p>${sentenceHtml || '&nbsp;'}</p>`
          }
          const html = `<p>${children || '&nbsp;'}</p>`
          return ctx ? wrapWithSegment(html, ctx) : html
        }

        case 'heading': {
          const level = node.getAttribute('level') || 1
          const html = `<h${level}>${children}</h${level}>`
          return ctx ? wrapWithSegment(html, ctx) : html
        }

        case 'bullet_list':
          return `<ul>${children}</ul>`

        case 'ordered_list': {
          const start = node.getAttribute('order')
          return start && start !== 1 ? `<ol start="${start}">${children}</ol>` : `<ol>${children}</ol>`
        }

        case 'list_item': {
          // Check if this list item should be split into sentence segments
          if (ctx && shouldSplitIntoSentences(ctx, 'list-item')) {
            const sentenceHtml = renderSentenceSegments(children, ctx)
            return `<li>${sentenceHtml}</li>`
          }
          const html = `<li>${children}</li>`
          return ctx ? wrapWithSegment(html, ctx) : html
        }

        case 'image': {
          const src = node.getAttribute('src') || ''
          const alt = node.getAttribute('alt') || ''
          const title = node.getAttribute('title') || ''
          const html = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" title="${escapeHtml(title)}" />`
          return ctx ? wrapWithSegment(html, ctx) : html
        }

        case 'slide_divider':
          return `<hr class="slide-divider" data-slide-divider="true" />`

        case 'blockquote': {
          const html = `<blockquote>${children}</blockquote>`
          return ctx ? wrapWithSegment(html, ctx) : html
        }

        case 'attribution':
          return `<cite>${children}</cite>`

        case 'hard_break':
          return '<br />'

        default:
          // For any unknown elements, just return children
          return children
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

  const htmlContent = $derived.by(() => {
    if (!content) return ''

    // Create segment context when in presenter mode with segments
    if (mode === 'present' && segments.length > 0) {
      const ctx: SegmentContext = {
        segments,
        segmentIndex: 0,
        currentSegmentId,
        inPresenterMode: true,
      }
      return xmlToHtml(content, ctx)
    }

    return xmlToHtml(content)
  })
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
      outline-color 0.2s ease;
    border-radius: 0.25rem;
    padding: 0.125rem 0.25rem;
    margin: -0.125rem -0.25rem;
  }

  .presentation-viewer :global(.segment-active) {
    background-color: rgba(59, 130, 246, 0.15);
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 2px;
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

  /* Headings */
  .presentation-viewer :global(h1) {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    margin-top: 1.5rem;
  }

  .presentation-viewer :global(h1:first-child) {
    margin-top: 0;
  }

  .presentation-viewer :global(h2) {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
    margin-top: 1.25rem;
  }

  .presentation-viewer :global(h3) {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    margin-top: 1rem;
  }

  /* Paragraph */
  .presentation-viewer :global(p) {
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  /* Lists */
  .presentation-viewer :global(ul) {
    margin-bottom: 1rem;
    padding-left: 2rem;
    list-style-type: disc;
  }

  .presentation-viewer :global(ol) {
    margin-bottom: 1rem;
    padding-left: 2rem;
    list-style-type: decimal;
  }

  .presentation-viewer :global(li) {
    margin-bottom: 0.25rem;
  }

  .presentation-viewer :global(li p) {
    margin-bottom: 0.25rem;
  }

  /* Nested lists */
  .presentation-viewer :global(ul ul),
  .presentation-viewer :global(ol ul) {
    list-style-type: circle;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
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
    margin-bottom: 0.5rem;
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
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, monospace;
    font-size: 0.875em;
  }

  /* Links */
  .presentation-viewer :global(a) {
    color: #3b82f6;
    text-decoration: underline;
  }

  .presentation-viewer :global(a:hover) {
    color: #2563eb;
  }
</style>
