<script lang="ts">
  import * as Y from 'yjs'
  import type { ResolvedTheme } from '$lib/utils/theme-resolver'

  interface Props {
    content: Y.XmlFragment | null
    theme: ResolvedTheme
    mode?: 'view' | 'present'
    currentPoint?: number
    onPointClick?: (index: number) => void
  }

  let { content, theme, mode = 'view', currentPoint = 0, onPointClick }: Props = $props()

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
   * Convert XmlFragment/XmlElement to HTML string
   */
  function xmlToHtml(node: Y.XmlFragment | Y.XmlElement | Y.XmlText | string): string {
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
      let children = ''

      node.forEach((child) => {
        children += xmlToHtml(child as Y.XmlElement | Y.XmlText | string)
      })

      switch (tagName) {
        case 'paragraph':
          return `<p>${children || '&nbsp;'}</p>`

        case 'heading': {
          const level = node.getAttribute('level') || 1
          return `<h${level}>${children}</h${level}>`
        }

        case 'bullet_list':
          return `<ul>${children}</ul>`

        case 'ordered_list': {
          const start = node.getAttribute('order')
          return start && start !== 1 ? `<ol start="${start}">${children}</ol>` : `<ol>${children}</ol>`
        }

        case 'list_item':
          return `<li>${children}</li>`

        case 'image': {
          const src = node.getAttribute('src') || ''
          const alt = node.getAttribute('alt') || ''
          const title = node.getAttribute('title') || ''
          return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" title="${escapeHtml(title)}" />`
        }

        case 'slide_divider':
          return `<hr class="slide-divider" data-slide-divider="true" />`

        case 'blockquote':
          return `<blockquote>${children}</blockquote>`

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
        html += xmlToHtml(child as Y.XmlElement | Y.XmlText | string)
      })
      return html
    }

    return ''
  }

  const htmlContent = $derived(content ? xmlToHtml(content) : '')
</script>

<div
  class="presentation-viewer h-full w-full overflow-auto"
  style:font-family={theme.font}
  style:background-color={theme.backgroundColor}
  style:color={theme.textColor}>
  {#if theme.viewport}
    <div
      class="viewport-container relative mx-auto"
      style:width="{theme.viewport.width}px"
      style:max-width="100%"
      style:aspect-ratio="{theme.viewport.width} / {theme.viewport.height}">
      <div class="prose max-w-none p-8" style:color={theme.textColor}>
        {#if htmlContent}
          {@html htmlContent}
        {:else}
          <p class="text-center opacity-50">No content yet</p>
        {/if}
      </div>
    </div>
  {:else}
    <div class="prose max-w-none p-8" style:color={theme.textColor}>
      {#if htmlContent}
        {@html htmlContent}
      {:else}
        <p class="text-center opacity-50">No content yet</p>
      {/if}
    </div>
  {/if}
</div>

<style>
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
