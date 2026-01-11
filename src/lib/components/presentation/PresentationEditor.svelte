<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { PresentationDocument } from '$lib/stores/documents'
  import type { ResolvedTheme } from '$lib/utils/theme-resolver'
  import { EditorState } from 'prosemirror-state'
  import { EditorView } from 'prosemirror-view'
  import { schema } from 'prosemirror-schema-basic'
  import { exampleSetup } from 'prosemirror-example-setup'
  import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from 'y-prosemirror'

  interface Props {
    doc: PresentationDocument
    theme: ResolvedTheme
  }

  let { doc, theme }: Props = $props()

  let editorElement: HTMLDivElement | undefined = $state()
  let view: EditorView | undefined

  onMount(() => {
    if (!editorElement) return

    const plugins = [
      ySyncPlugin(doc.content),
      yUndoPlugin(),
      ...exampleSetup({ schema, history: false }),
    ]

    // Add cursor plugin if awareness is available
    if (doc.provider.awareness) {
      plugins.unshift(yCursorPlugin(doc.provider.awareness))
    }

    const state = EditorState.create({
      schema,
      plugins,
    })

    view = new EditorView(editorElement, { state })
  })

  onDestroy(() => {
    view?.destroy()
  })
</script>

<div
  class="presentation-editor h-full w-full overflow-auto"
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
        <div bind:this={editorElement} class="editor-content"></div>
      </div>
    </div>
  {:else}
    <div class="prose max-w-none p-8" style:color={theme.textColor}>
      <div bind:this={editorElement} class="editor-content"></div>
    </div>
  {/if}
</div>

<style>
  .editor-content :global(.ProseMirror) {
    outline: none;
    min-height: 300px;
  }

  .editor-content :global(.ProseMirror p) {
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  .editor-content :global(.ProseMirror h1) {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }

  .editor-content :global(.ProseMirror h2) {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
  }

  .editor-content :global(.ProseMirror h3) {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .editor-content :global(.ProseMirror ul),
  .editor-content :global(.ProseMirror ol) {
    margin-bottom: 1rem;
    padding-left: 2rem;
  }

  .editor-content :global(.ProseMirror li) {
    margin-bottom: 0.25rem;
  }

  /* Cursor styles for collaborative editing */
  .editor-content :global(.yjs-cursor) {
    position: absolute;
    border-left: 2px solid;
    border-color: var(--cursor-color, #3b82f6);
    margin-left: -1px;
    pointer-events: none;
  }

  .editor-content :global(.yjs-cursor > div) {
    position: absolute;
    top: -1.2em;
    left: -1px;
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    white-space: nowrap;
    background-color: var(--cursor-color, #3b82f6);
    color: white;
  }

  /* ProseMirror menu bar */
  .presentation-editor :global(.ProseMirror-menubar) {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    border-bottom: 1px solid #e5e7eb;
    padding: 0.5rem;
    margin-bottom: 1rem;
  }

  .presentation-editor :global(.ProseMirror-menubar-wrapper) {
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
  }

  .presentation-editor :global(.ProseMirror-icon) {
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    border-radius: 0.25rem;
  }

  .presentation-editor :global(.ProseMirror-icon:hover) {
    background-color: #f3f4f6;
  }

  .presentation-editor :global(.ProseMirror-menu-active) {
    background-color: #e5e7eb;
  }
</style>
