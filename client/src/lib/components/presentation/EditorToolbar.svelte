<script lang="ts">
  import type { EditorView } from 'prosemirror-view'
  import type { EditorState } from 'prosemirror-state'
  import { toggleMark, setBlockType } from 'prosemirror-commands'
  import { wrapInList, liftListItem } from 'prosemirror-schema-list'
  import { undo, redo } from 'prosemirror-history'
  import { presentationSchema } from '$lib/editor/schema'
  import { insertSlideDivider, wrapInBlockquote, fileToDataUrl } from '$lib/editor/setup'
  import { canMergeSegments, canUnmergeSegments, toggleMergeSegments } from '$lib/editor/merge-commands'

  interface Props {
    view: EditorView | null
    editorState: EditorState | null
  }

  let { view, editorState }: Props = $props()

  let fileInput: HTMLInputElement

  function isMarkActive(state: EditorState, markType: typeof presentationSchema.marks.strong) {
    const { from, to, empty } = state.selection
    const resolvedFrom = state.selection.$from
    if (empty) {
      return !!markType.isInSet(state.storedMarks || resolvedFrom.marks())
    }
    return state.doc.rangeHasMark(from, to, markType)
  }

  function isBlockActive(
    state: EditorState,
    nodeType: typeof presentationSchema.nodes.paragraph,
    attrs?: Record<string, unknown>,
  ) {
    const { to } = state.selection
    const resolvedFrom = state.selection.$from
    let active = false
    state.doc.nodesBetween(resolvedFrom.pos, to, (node) => {
      if (node.type === nodeType) {
        if (!attrs || Object.entries(attrs).every(([key, value]) => node.attrs[key] === value)) {
          active = true
        }
      }
    })
    return active
  }

  function isInBlockquote(state: EditorState) {
    const resolvedPos = state.selection.$from
    for (let depth = resolvedPos.depth; depth > 0; depth--) {
      if (resolvedPos.node(depth).type === presentationSchema.nodes.blockquote) {
        return true
      }
    }
    return false
  }

  function isInList(state: EditorState, listType: typeof presentationSchema.nodes.bullet_list) {
    const resolvedPos = state.selection.$from
    for (let depth = resolvedPos.depth; depth > 0; depth--) {
      if (resolvedPos.node(depth).type === listType) {
        return true
      }
    }
    return false
  }

  function runCommand(command: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean) {
    if (!view) return
    command(view.state, view.dispatch)
    view.focus()
  }

  function toggleFormat(markType: typeof presentationSchema.marks.strong) {
    if (!view) return
    toggleMark(markType)(view.state, view.dispatch)
    view.focus()
  }

  function setHeading(level: number) {
    if (!view) return
    setBlockType(presentationSchema.nodes.heading, { level })(view.state, view.dispatch)
    view.focus()
  }

  function setParagraph() {
    if (!view) return
    setBlockType(presentationSchema.nodes.paragraph)(view.state, view.dispatch)
    view.focus()
  }

  function toggleBulletList() {
    if (!view) return
    if (isInList(view.state, presentationSchema.nodes.bullet_list)) {
      liftListItem(presentationSchema.nodes.list_item)(view.state, view.dispatch)
    } else if (isInList(view.state, presentationSchema.nodes.ordered_list)) {
      // Switch from ordered to bullet: lift then wrap
      liftListItem(presentationSchema.nodes.list_item)(view.state, view.dispatch)
      wrapInList(presentationSchema.nodes.bullet_list)(view.state, view.dispatch)
    } else {
      wrapInList(presentationSchema.nodes.bullet_list)(view.state, view.dispatch)
    }
    view.focus()
  }

  function toggleOrderedList() {
    if (!view) return
    if (isInList(view.state, presentationSchema.nodes.ordered_list)) {
      liftListItem(presentationSchema.nodes.list_item)(view.state, view.dispatch)
    } else if (isInList(view.state, presentationSchema.nodes.bullet_list)) {
      // Switch from bullet to ordered: lift then wrap
      liftListItem(presentationSchema.nodes.list_item)(view.state, view.dispatch)
      wrapInList(presentationSchema.nodes.ordered_list)(view.state, view.dispatch)
    } else {
      wrapInList(presentationSchema.nodes.ordered_list)(view.state, view.dispatch)
    }
    view.focus()
  }

  function insertDivider() {
    if (!view) return
    insertSlideDivider(presentationSchema)(view.state, view.dispatch)
    view.focus()
  }

  function insertBlockquote() {
    if (!view) return
    wrapInBlockquote(presentationSchema)(view.state, view.dispatch)
    view.focus()
  }

  function handleMerge() {
    if (!view) return
    toggleMergeSegments(view.state, view.dispatch)
    view.focus()
  }

  // Reactive check for merge button state
  const canMerge = $derived(editorState ? canMergeSegments(editorState) : false)
  const canUnmerge = $derived(editorState ? canUnmergeSegments(editorState) : false)

  function triggerImageUpload() {
    fileInput?.click()
  }

  async function handleImageSelect(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file || !view) return

    try {
      const dataUrl = await fileToDataUrl(file)
      const image = presentationSchema.nodes.image.create({ src: dataUrl, alt: file.name })
      view.dispatch(view.state.tr.replaceSelectionWith(image).scrollIntoView())
      view.focus()
    } catch (error) {
      console.error('Failed to insert image:', error)
    }

    // Reset input
    target.value = ''
  }
</script>

<div
  class="editor-toolbar sticky top-14 flex flex-wrap items-center gap-1.5 border-b border-base-300 bg-base-200 p-2 sm:gap-1">
  <!-- Headings -->
  <div class="join mr-1 border-r border-base-300 pr-2">
    <button
      type="button"
      onclick={() => setHeading(1)}
      class="btn join-item btn-sm sm:btn-xs {(
        editorState && isBlockActive(editorState, presentationSchema.nodes.heading, { level: 1 })
      ) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Heading 1 (Ctrl+1)">
      H1
    </button>
    <button
      type="button"
      onclick={() => setHeading(2)}
      class="btn join-item btn-sm sm:btn-xs {(
        editorState && isBlockActive(editorState, presentationSchema.nodes.heading, { level: 2 })
      ) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Heading 2 (Ctrl+2)">
      H2
    </button>
    <button
      type="button"
      onclick={() => setHeading(3)}
      class="btn join-item btn-sm sm:btn-xs {(
        editorState && isBlockActive(editorState, presentationSchema.nodes.heading, { level: 3 })
      ) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Heading 3 (Ctrl+3)">
      H3
    </button>
    <button
      type="button"
      onclick={setParagraph}
      class="btn join-item btn-sm sm:btn-xs {(
        editorState &&
        isBlockActive(editorState, presentationSchema.nodes.paragraph) &&
        !isBlockActive(editorState, presentationSchema.nodes.heading)
      ) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Paragraph (Ctrl+0)">
      P
    </button>
  </div>

  <!-- Text Formatting -->
  <div class="join mr-1 border-r border-base-300 pr-2">
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.strong)}
      class="btn join-item btn-sm sm:btn-xs {editorState && isMarkActive(editorState, presentationSchema.marks.strong) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Bold (Ctrl+B)">
      <span class="text-sm font-bold">B</span>
    </button>
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.em)}
      class="btn join-item btn-sm sm:btn-xs {editorState && isMarkActive(editorState, presentationSchema.marks.em) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Italic (Ctrl+I)">
      <span class="text-sm italic">I</span>
    </button>
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.underline)}
      class="btn join-item btn-sm sm:btn-xs {(
        editorState && isMarkActive(editorState, presentationSchema.marks.underline)
      ) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Underline (Ctrl+U)">
      <span class="text-sm underline">U</span>
    </button>
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.strikethrough)}
      class="btn join-item btn-sm sm:btn-xs {(
        editorState && isMarkActive(editorState, presentationSchema.marks.strikethrough)
      ) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Strikethrough (Ctrl+Shift+S)">
      <span class="text-sm line-through">S</span>
    </button>
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.code)}
      class="btn join-item btn-sm sm:btn-xs {editorState && isMarkActive(editorState, presentationSchema.marks.code) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Code (Ctrl+`)">
      <span class="font-mono text-xs">&lt;/&gt;</span>
    </button>
  </div>

  <!-- Lists -->
  <div class="join mr-1 border-r border-base-300 pr-2">
    <button
      type="button"
      onclick={toggleBulletList}
      class="btn join-item btn-sm sm:btn-xs {(
        editorState && isInList(editorState, presentationSchema.nodes.bullet_list)
      ) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Bullet List (Ctrl+Shift+8)"
      aria-label="Bullet list">
      <svg class="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <button
      type="button"
      onclick={toggleOrderedList}
      class="btn join-item btn-sm sm:btn-xs {(
        editorState && isInList(editorState, presentationSchema.nodes.ordered_list)
      ) ?
        'btn-primary'
      : 'btn-ghost'}"
      title="Numbered List (Ctrl+Shift+9)"
      aria-label="Numbered list">
      <svg class="h-4 w-4" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
        <text x="2" y="8" font-size="6" font-family="monospace">1.</text>
        <text x="2" y="14" font-size="6" font-family="monospace">2.</text>
        <text x="2" y="20" font-size="6" font-family="monospace">3.</text>
        <line x1="10" y1="6" x2="22" y2="6" stroke="currentColor" stroke-width="2" />
        <line x1="10" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2" />
        <line x1="10" y1="18" x2="22" y2="18" stroke="currentColor" stroke-width="2" />
      </svg>
    </button>
  </div>

  <!-- Block Elements -->
  <div class="join mr-1 border-r border-base-300 pr-2">
    <button
      type="button"
      onclick={insertBlockquote}
      class="btn join-item btn-sm sm:btn-xs {editorState && isInBlockquote(editorState) ? 'btn-primary' : 'btn-ghost'}"
      title="Quote (Ctrl+Shift+.)"
      aria-label="Blockquote">
      <svg class="h-4 w-4" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
      </svg>
    </button>
    <button
      type="button"
      onclick={triggerImageUpload}
      class="btn join-item btn-ghost btn-sm sm:btn-xs"
      title="Insert Image"
      aria-label="Insert image">
      <svg class="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>
    <button
      type="button"
      onclick={insertDivider}
      class="btn join-item btn-ghost btn-sm sm:btn-xs"
      title="Slide Divider (---)"
      aria-label="Slide divider">
      <svg class="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16" />
      </svg>
    </button>
  </div>

  <!-- Segment Merge -->
  <div class="join mr-1 border-r border-base-300 pr-2">
    <button
      type="button"
      onclick={handleMerge}
      disabled={!canMerge && !canUnmerge}
      class="btn join-item btn-sm sm:btn-xs {canUnmerge ? 'btn-info' : 'btn-ghost'}"
      title={canUnmerge ? 'Unmerge Segments (Ctrl+Shift+M)' : 'Merge Segments (Ctrl+M)'}
      aria-label={canUnmerge ? 'Unmerge segments' : 'Merge segments'}>
      <svg class="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    </button>
  </div>

  <!-- Undo/Redo -->
  <div class="join">
    <button
      type="button"
      onclick={() => runCommand(undo)}
      class="btn join-item btn-ghost btn-sm sm:btn-xs"
      title="Undo (Ctrl+Z)"
      aria-label="Undo">
      <svg class="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    </button>
    <button
      type="button"
      onclick={() => runCommand(redo)}
      class="btn join-item btn-ghost btn-sm sm:btn-xs"
      title="Redo (Ctrl+Y)"
      aria-label="Redo">
      <svg class="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
      </svg>
    </button>
  </div>

  <!-- Hidden file input for images -->
  <input bind:this={fileInput} type="file" accept="image/*" class="hidden" onchange={handleImageSelect} />
</div>
