<script lang="ts">
  import type * as Y from 'yjs'
  import type { ResolvedTheme } from '$lib/utils/theme-resolver'

  interface Props {
    content: Y.XmlFragment | null
    theme: ResolvedTheme
    mode?: 'view' | 'present'
    currentPoint?: number
    onPointClick?: (index: number) => void
  }

  let { content, theme, mode = 'view', currentPoint = 0, onPointClick }: Props = $props()

  // Convert XmlFragment to HTML string for rendering
  function xmlFragmentToHtml(fragment: Y.XmlFragment | null): string {
    if (!fragment) return ''

    // Convert Yjs XmlFragment to HTML
    // This is a simplified conversion - ProseMirror content needs proper serialization
    let html = ''
    fragment.forEach((item) => {
      if (item instanceof Object && 'nodeName' in item) {
        const node = item as Y.XmlElement
        const tagName = node.nodeName.toLowerCase()
        const children = xmlFragmentToHtml(node as unknown as Y.XmlFragment)

        if (tagName === 'paragraph') {
          html += `<p>${children || '&nbsp;'}</p>`
        } else if (tagName === 'heading') {
          const level = node.getAttribute('level') || 1
          html += `<h${level}>${children}</h${level}>`
        } else if (tagName === 'text') {
          html += children
        } else {
          html += `<${tagName}>${children}</${tagName}>`
        }
      } else if (typeof item === 'string') {
        html += item
      }
    })

    return html
  }

  const htmlContent = $derived(xmlFragmentToHtml(content))
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
  .presentation-viewer :global(h1) {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }

  .presentation-viewer :global(h2) {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
  }

  .presentation-viewer :global(h3) {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .presentation-viewer :global(p) {
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  .presentation-viewer :global(ul),
  .presentation-viewer :global(ol) {
    margin-bottom: 1rem;
    padding-left: 2rem;
  }

  .presentation-viewer :global(li) {
    margin-bottom: 0.25rem;
  }
</style>
