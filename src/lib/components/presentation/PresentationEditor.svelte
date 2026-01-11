<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { PresentationDocument } from '$lib/stores/documents'
  import type { ResolvedTheme } from '$lib/utils/theme-resolver'
  import { EditorState } from 'prosemirror-state'
  import { EditorView } from 'prosemirror-view'
  import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from 'y-prosemirror'
  import { presentationSchema, createEditorPlugins } from '$lib/editor/setup'
  import { createSegmentPlugin } from '$lib/editor/segment-plugin'
  import EditorToolbar from './EditorToolbar.svelte'

  interface Props {
    doc: PresentationDocument
    theme: ResolvedTheme
  }

  let { doc, theme }: Props = $props()

  // Use a unique ID for the editor container
  const editorId = `prosemirror-editor-${Math.random().toString(36).slice(2)}`
  let view: EditorView | null = $state(null)

  onMount(() => {
    // Query the element directly - it should exist by the time onMount runs
    const editorElement = document.getElementById(editorId)
    if (!editorElement) return

    const plugins = [
      ySyncPlugin(doc.content),
      yUndoPlugin(),
      createSegmentPlugin(presentationSchema),
      ...createEditorPlugins(presentationSchema),
    ]

    // Add cursor plugin if awareness is available
    // Note: yCursorPlugin must come AFTER ySyncPlugin because it depends on its state
    if (doc.provider?.awareness) {
      plugins.splice(1, 0, yCursorPlugin(doc.provider.awareness))
    }

    const state = EditorState.create({
      schema: presentationSchema,
      plugins,
    })

    view = new EditorView(editorElement, { state })
  })

  onDestroy(() => {
    view?.destroy()
  })
</script>

<div class="presentation-editor flex min-h-0 flex-1 flex-col">
  <!-- Toolbar -->
  <EditorToolbar {view} />

  <!-- Editor Content -->
  <div
    class="flex-1 overflow-auto"
    style:font-family={theme.font}
    style:background-color={theme.backgroundColor}
    style:color={theme.textColor}
    style:min-height="200px">
    {#if theme.viewport}
      <div
        class="viewport-container relative mx-auto"
        style:width="{theme.viewport.width}px"
        style:max-width="100%"
        style:aspect-ratio="{theme.viewport.width} / {theme.viewport.height}">
        <div class="prose h-full max-w-none p-8" style:color={theme.textColor}>
          <div id={editorId} class="editor-content h-full"></div>
        </div>
      </div>
    {:else}
      <div class="prose h-full max-w-none p-8" style:color={theme.textColor}>
        <div id={editorId} class="editor-content h-full"></div>
      </div>
    {/if}
  </div>
</div>

<style>
  .editor-content :global(.ProseMirror) {
    outline: none;
    min-height: 300px;
  }

  /* Segment boundary indicators - subtle left border */
  .editor-content :global(.segment-boundary) {
    position: relative;
  }

  .editor-content :global(.segment-boundary::before) {
    content: '';
    position: absolute;
    left: -0.75rem;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: rgba(59, 130, 246, 0.15);
    border-radius: 2px;
    transition: background-color 0.2s ease;
  }

  /* More visible on hover */
  .editor-content :global(.segment-boundary:hover::before) {
    background-color: rgba(59, 130, 246, 0.4);
  }

  /* Heading segments get purple tint */
  .editor-content :global(.segment-boundary[data-segment-type='heading']::before) {
    background-color: rgba(139, 92, 246, 0.2);
  }

  .editor-content :global(.segment-boundary[data-segment-type='heading']:hover::before) {
    background-color: rgba(139, 92, 246, 0.5);
  }

  /* Merged segments - light blue background with border */
  .editor-content :global(.merged-segment) {
    background-color: rgba(59, 130, 246, 0.1);
    border-left: 3px solid rgba(59, 130, 246, 0.5);
    margin-left: -3px;
    padding-left: 3px;
  }

  .editor-content :global(.merged-segment::before) {
    /* Override normal segment boundary indicator for merged segments */
    background-color: rgba(59, 130, 246, 0.5);
  }

  .editor-content :global(.merged-segment-start) {
    border-top-left-radius: 4px;
    border-top: 2px solid rgba(59, 130, 246, 0.5);
    margin-top: -2px;
    padding-top: 2px;
  }

  .editor-content :global(.merged-segment-end) {
    border-bottom-left-radius: 4px;
    border-bottom: 2px solid rgba(59, 130, 246, 0.5);
    margin-bottom: -2px;
    padding-bottom: 2px;
  }

  /* Sentence segments are inline - subtle background */
  .editor-content :global(.ProseMirror span[data-sentence]) {
    position: relative;
    border-left: 2px solid rgba(59, 130, 246, 0.1);
    padding-left: 0.25rem;
    margin-left: 0.125rem;
  }

  .editor-content :global(.ProseMirror span[data-sentence]:hover) {
    border-left-color: rgba(59, 130, 246, 0.3);
    background-color: rgba(59, 130, 246, 0.05);
  }

  .editor-content :global(.ProseMirror p) {
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  .editor-content :global(.ProseMirror h1) {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    margin-top: 1.5rem;
  }

  .editor-content :global(.ProseMirror h2) {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
    margin-top: 1.25rem;
  }

  .editor-content :global(.ProseMirror h3) {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    margin-top: 1rem;
  }

  /* Lists */
  .editor-content :global(.ProseMirror ul) {
    margin-bottom: 1rem;
    padding-left: 2rem;
    list-style-type: disc;
  }

  .editor-content :global(.ProseMirror ol) {
    margin-bottom: 1rem;
    padding-left: 2rem;
    list-style-type: decimal;
  }

  .editor-content :global(.ProseMirror li) {
    margin-bottom: 0.25rem;
  }

  .editor-content :global(.ProseMirror li p) {
    margin-bottom: 0.25rem;
  }

  /* Nested lists */
  .editor-content :global(.ProseMirror ul ul),
  .editor-content :global(.ProseMirror ol ul) {
    list-style-type: circle;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .editor-content :global(.ProseMirror ul ul ul),
  .editor-content :global(.ProseMirror ol ul ul) {
    list-style-type: square;
  }

  /* Images */
  .editor-content :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.25rem;
    margin: 1rem 0;
  }

  .editor-content :global(.ProseMirror img.ProseMirror-selectednode) {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Slide divider */
  .editor-content :global(.ProseMirror hr.slide-divider) {
    border: none;
    border-top: 3px dashed #3b82f6;
    margin: 2rem 0;
    position: relative;
  }

  .editor-content :global(.ProseMirror hr.slide-divider::after) {
    content: 'New Slide';
    position: absolute;
    top: -0.75rem;
    left: 50%;
    transform: translateX(-50%);
    background-color: #1f2937;
    padding: 0 0.5rem;
    font-size: 0.75rem;
    color: #3b82f6;
    font-weight: 500;
  }

  /* Blockquote */
  .editor-content :global(.ProseMirror blockquote) {
    border-left: 4px solid #3b82f6;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
  }

  .editor-content :global(.ProseMirror blockquote p) {
    margin-bottom: 0.5rem;
  }

  /* Attribution */
  .editor-content :global(.ProseMirror cite) {
    display: block;
    font-size: 0.875rem;
    color: #9ca3af;
    margin-top: 0.5rem;
    font-style: normal;
  }

  .editor-content :global(.ProseMirror cite::before) {
    content: '— ';
  }

  /* Inline code */
  .editor-content :global(.ProseMirror code) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, monospace;
    font-size: 0.875em;
  }

  /* Links */
  .editor-content :global(.ProseMirror a) {
    color: #3b82f6;
    text-decoration: underline;
  }

  .editor-content :global(.ProseMirror a:hover) {
    color: #2563eb;
  }

  /* Hard break */
  .editor-content :global(.ProseMirror br) {
    display: block;
    content: '';
  }

  /* Cursor styles for collaborative editing */
  .editor-content :global(.yjs-cursor) {
    position: absolute;
    border-left: 2px solid;
    border-color: var(--cursor-color, #3b82f6);
    margin-left: -1px;
    pointer-events: none;
    z-index: 10;
  }

  .editor-content :global(.yjs-cursor > div) {
    position: absolute;
    top: -1.4em;
    left: -1px;
    font-size: 0.7rem;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem 0.25rem 0.25rem 0;
    white-space: nowrap;
    background-color: var(--cursor-color, #3b82f6);
    color: white;
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }

  /* Selection in collaborative mode */
  .editor-content :global(.ProseMirror .ProseMirror-yjs-cursor) {
    position: relative;
  }

  /* Remote user selection highlighting */
  .editor-content :global(.ProseMirror-yjs-selection) {
    background-color: var(--selection-color, rgba(59, 130, 246, 0.3));
  }

  /* Gap cursor */
  .editor-content :global(.ProseMirror-gapcursor) {
    display: none;
    pointer-events: none;
    position: absolute;
  }

  .editor-content :global(.ProseMirror-gapcursor:after) {
    content: '';
    display: block;
    position: absolute;
    top: -2px;
    width: 20px;
    border-top: 1px solid #3b82f6;
    animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
  }

  @keyframes ProseMirror-cursor-blink {
    to {
      visibility: hidden;
    }
  }

  .editor-content :global(.ProseMirror-focused .ProseMirror-gapcursor) {
    display: block;
  }
</style>
