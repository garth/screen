<script lang="ts">
  import type { EditorView } from 'prosemirror-view'
  import type { EditorState } from 'prosemirror-state'
  import { toggleMark, setBlockType } from 'prosemirror-commands'
  import { wrapInList, liftListItem } from 'prosemirror-schema-list'
  import { undo, redo } from 'prosemirror-history'
  import { presentationSchema } from '$lib/editor/schema'
  import { insertSlideDivider, wrapInBlockquote, fileToDataUrl } from '$lib/editor/setup'

  interface Props {
    view: EditorView | null
  }

  let { view }: Props = $props()

  let fileInput: HTMLInputElement

  function isMarkActive(state: EditorState, markType: typeof presentationSchema.marks.strong) {
    const { from, to, empty } = state.selection
    const resolvedFrom = state.selection.$from
    if (empty) {
      return !!markType.isInSet(state.storedMarks || resolvedFrom.marks())
    }
    return state.doc.rangeHasMark(from, to, markType)
  }

  function isBlockActive(state: EditorState, nodeType: typeof presentationSchema.nodes.paragraph, attrs?: Record<string, unknown>) {
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

  function runCommand(command: (state: EditorState, dispatch?: (tr: any) => void) => boolean) {
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
    wrapInList(presentationSchema.nodes.bullet_list)(view.state, view.dispatch)
    view.focus()
  }

  function toggleOrderedList() {
    if (!view) return
    wrapInList(presentationSchema.nodes.ordered_list)(view.state, view.dispatch)
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

<div class="editor-toolbar flex flex-wrap items-center gap-1 border-b border-gray-600 bg-gray-700 p-2">
  <!-- Undo/Redo -->
  <div class="flex items-center gap-0.5 border-r border-gray-600 pr-2 mr-1">
    <button
      type="button"
      onclick={() => runCommand(undo)}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white"
      title="Undo (Ctrl+Z)">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    </button>
    <button
      type="button"
      onclick={() => runCommand(redo)}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white"
      title="Redo (Ctrl+Y)">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
      </svg>
    </button>
  </div>

  <!-- Text Formatting -->
  <div class="flex items-center gap-0.5 border-r border-gray-600 pr-2 mr-1">
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.strong)}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white {view && isMarkActive(view.state, presentationSchema.marks.strong) ? 'bg-gray-600 text-white' : ''}"
      title="Bold (Ctrl+B)">
      <span class="font-bold text-sm">B</span>
    </button>
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.em)}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white {view && isMarkActive(view.state, presentationSchema.marks.em) ? 'bg-gray-600 text-white' : ''}"
      title="Italic (Ctrl+I)">
      <span class="italic text-sm">I</span>
    </button>
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.underline)}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white {view && isMarkActive(view.state, presentationSchema.marks.underline) ? 'bg-gray-600 text-white' : ''}"
      title="Underline (Ctrl+U)">
      <span class="underline text-sm">U</span>
    </button>
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.strikethrough)}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white {view && isMarkActive(view.state, presentationSchema.marks.strikethrough) ? 'bg-gray-600 text-white' : ''}"
      title="Strikethrough (Ctrl+Shift+S)">
      <span class="line-through text-sm">S</span>
    </button>
    <button
      type="button"
      onclick={() => toggleFormat(presentationSchema.marks.code)}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white {view && isMarkActive(view.state, presentationSchema.marks.code) ? 'bg-gray-600 text-white' : ''}"
      title="Code (Ctrl+`)">
      <span class="font-mono text-xs">&lt;/&gt;</span>
    </button>
  </div>

  <!-- Headings -->
  <div class="flex items-center gap-0.5 border-r border-gray-600 pr-2 mr-1">
    <button
      type="button"
      onclick={setParagraph}
      class="rounded px-2 py-1 text-xs text-gray-300 hover:bg-gray-600 hover:text-white"
      title="Paragraph (Ctrl+0)">
      P
    </button>
    <button
      type="button"
      onclick={() => setHeading(1)}
      class="rounded px-2 py-1 text-xs text-gray-300 hover:bg-gray-600 hover:text-white {view && isBlockActive(view.state, presentationSchema.nodes.heading, { level: 1 }) ? 'bg-gray-600 text-white' : ''}"
      title="Heading 1 (Ctrl+1)">
      H1
    </button>
    <button
      type="button"
      onclick={() => setHeading(2)}
      class="rounded px-2 py-1 text-xs text-gray-300 hover:bg-gray-600 hover:text-white {view && isBlockActive(view.state, presentationSchema.nodes.heading, { level: 2 }) ? 'bg-gray-600 text-white' : ''}"
      title="Heading 2 (Ctrl+2)">
      H2
    </button>
    <button
      type="button"
      onclick={() => setHeading(3)}
      class="rounded px-2 py-1 text-xs text-gray-300 hover:bg-gray-600 hover:text-white {view && isBlockActive(view.state, presentationSchema.nodes.heading, { level: 3 }) ? 'bg-gray-600 text-white' : ''}"
      title="Heading 3 (Ctrl+3)">
      H3
    </button>
  </div>

  <!-- Lists -->
  <div class="flex items-center gap-0.5 border-r border-gray-600 pr-2 mr-1">
    <button
      type="button"
      onclick={toggleBulletList}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white"
      title="Bullet List (Ctrl+Shift+8)">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <button
      type="button"
      onclick={toggleOrderedList}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white"
      title="Numbered List (Ctrl+Shift+9)">
      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
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
  <div class="flex items-center gap-0.5 border-r border-gray-600 pr-2 mr-1">
    <button
      type="button"
      onclick={insertBlockquote}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white"
      title="Quote (Ctrl+Shift+.)">
      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
      </svg>
    </button>
    <button
      type="button"
      onclick={triggerImageUpload}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white"
      title="Insert Image">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>
    <button
      type="button"
      onclick={insertDivider}
      class="rounded p-1.5 text-gray-300 hover:bg-gray-600 hover:text-white"
      title="Slide Divider (---)">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16" />
      </svg>
    </button>
  </div>

  <!-- Hidden file input for images -->
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    onchange={handleImageSelect} />
</div>
