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

    // Dispatch a no-op transaction to trigger segment ID assignment on initial load
    // This is needed because appendTransaction only runs when there are transactions
    view.dispatch(view.state.tr)
  })

  onDestroy(() => {
    view?.destroy()
  })
</script>

<div class="presentation-editor flex min-h-0 flex-1 flex-col">
  <!-- Toolbar -->
  <EditorToolbar {view} />

  <!-- Editor Content -->
  <div class="flex-1 overflow-auto bg-base-100">
    <div class="prose-base-content prose h-full max-w-none p-8">
      <div id={editorId} class="editor-content h-full"></div>
    </div>
  </div>
</div>

<style>
  .editor-content :global(.ProseMirror > :first-child) {
    margin-top: 0;
  }

  .editor-content :global(.ProseMirror) {
    outline: none;
    min-height: 300px;
  }

  /* Segment boundary indicators - left border */
  .editor-content :global(.segment-boundary) {
    border-left: 3px solid rgba(99, 102, 241, 0.5);
    transition: border-color 0.2s ease;
  }

  /* Brighter on hover */
  .editor-content :global(.segment-boundary:hover) {
    border-left-color: rgba(99, 102, 241, 0.8);
  }

  /* Heading segments get secondary color */
  .editor-content :global(.segment-boundary[data-segment-type='heading']) {
    border-left-color: rgba(139, 92, 246, 0.55);
  }

  .editor-content :global(.segment-boundary[data-segment-type='heading']:hover) {
    border-left-color: rgba(139, 92, 246, 0.85);
  }

  /* Merged segments - light background with connected border */
  .editor-content :global(.merged-segment) {
    background-color: rgba(99, 102, 241, 0.08);
    border-left-color: rgba(99, 102, 241, 0.7);
    border-left-width: 4px;
  }

  .editor-content :global(.merged-segment-start) {
    border-top-left-radius: 6px;
    border-top: 2px solid rgba(99, 102, 241, 0.7);
    padding-top: 4px;
  }

  .editor-content :global(.merged-segment-end) {
    border-bottom-left-radius: 6px;
    border-bottom: 2px solid rgba(99, 102, 241, 0.7);
    padding-bottom: 4px;
  }

  /* Middle segments in a merge group - no gap between them */
  .editor-content :global(.merged-segment:not(.merged-segment-start)) {
    margin-top: -1rem;
    padding-top: 1rem;
  }

  /* Sentence segments are inline - subtle background */
  .editor-content :global(.ProseMirror span[data-sentence]) {
    position: relative;
    border-left: 2px solid color-mix(in oklch, oklch(var(--p)) 10%, transparent);
    padding-left: 0.25rem;
    margin-left: 0.125rem;
  }

  .editor-content :global(.ProseMirror span[data-sentence]:hover) {
    border-left-color: color-mix(in oklch, oklch(var(--p)) 30%, transparent);
    background-color: color-mix(in oklch, oklch(var(--p)) 5%, transparent);
  }

  .editor-content :global(.ProseMirror p) {
    margin: 0;
    line-height: 1.6;
    min-height: 1.6em;
    padding: 0.1px 0;
  }

  .editor-content :global(.ProseMirror h1) {
    font-size: 2.5rem;
    font-weight: bold;
    margin: 0;
  }

  .editor-content :global(.ProseMirror h2) {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
  }

  .editor-content :global(.ProseMirror h3) {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0;
  }

  /* Lists */
  .editor-content :global(.ProseMirror ul) {
    margin: 0;
    padding-left: 2rem;
    list-style-type: disc;
  }

  .editor-content :global(.ProseMirror ol) {
    margin: 0;
    padding-left: 2rem;
    list-style-type: decimal;
  }

  .editor-content :global(.ProseMirror li) {
    margin: 0;
  }

  .editor-content :global(.ProseMirror li p) {
    margin: 0;
  }

  /* Nested lists */
  .editor-content :global(.ProseMirror ul ul),
  .editor-content :global(.ProseMirror ol ul) {
    list-style-type: circle;
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
    outline: 2px solid oklch(var(--p));
    outline-offset: 2px;
  }

  /* Slide divider */
  .editor-content :global(.ProseMirror hr.slide-divider) {
    border: none;
    border-top: 3px dashed oklch(var(--p));
    margin: 2rem 0;
    position: relative;
  }

  .editor-content :global(.ProseMirror hr.slide-divider::after) {
    content: 'New Slide';
    position: absolute;
    top: -0.75rem;
    left: 50%;
    transform: translateX(-50%);
    background-color: oklch(var(--b2));
    padding: 0 0.5rem;
    font-size: 0.75rem;
    color: oklch(var(--p));
    font-weight: 500;
  }

  /* Blockquote */
  .editor-content :global(.ProseMirror blockquote) {
    border-left: 4px solid oklch(var(--p));
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
  }

  .editor-content :global(.ProseMirror blockquote p) {
    margin: 0;
  }

  /* Attribution */
  .editor-content :global(.ProseMirror cite) {
    display: block;
    font-size: 0.875rem;
    color: color-mix(in oklch, oklch(var(--bc)) 60%, transparent);
    margin-top: 0.5rem;
    font-style: normal;
  }

  .editor-content :global(.ProseMirror cite::before) {
    content: '— ';
  }

  /* Inline code */
  .editor-content :global(.ProseMirror code) {
    background-color: color-mix(in oklch, oklch(var(--bc)) 10%, transparent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, monospace;
    font-size: 0.875em;
  }

  /* Links */
  .editor-content :global(.ProseMirror a) {
    color: oklch(var(--p));
    text-decoration: underline;
  }

  .editor-content :global(.ProseMirror a:hover) {
    color: oklch(var(--pf));
  }

  /* Hard break and trailing break in empty paragraphs */
  .editor-content :global(.ProseMirror br) {
    display: inline;
  }

  .editor-content :global(.ProseMirror p > br:only-child),
  .editor-content :global(.ProseMirror p > .ProseMirror-trailingBreak:only-child) {
    display: inline-block;
    width: 1px;
    height: 1.6em;
    vertical-align: top;
  }

  /* Cursor styles for collaborative editing */
  .editor-content :global(.yjs-cursor) {
    position: absolute;
    border-left: 2px solid;
    border-color: var(--cursor-color, oklch(var(--p)));
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
    background-color: var(--cursor-color, oklch(var(--p)));
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
    background-color: var(--selection-color, color-mix(in oklch, oklch(var(--p)) 30%, transparent));
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
    border-top: 1px solid oklch(var(--p));
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
