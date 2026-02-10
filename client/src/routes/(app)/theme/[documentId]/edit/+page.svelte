<script lang="ts">
  import { onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import { toast } from '$lib/toast.svelte'
  import { auth } from '$lib/stores/auth.svelte'
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte'
  import { createThemeDoc } from '$lib/stores/documents'

  const documentId = page.params.documentId!

  const doc = createThemeDoc({ documentId })

  // Local state for inputs
  let fontInput = $state('')
  let bgColorInput = $state('#ffffff')
  let textColorInput = $state('#000000')
  let vpX = $state(0)
  let vpY = $state(0)
  let vpWidth = $state(1920)
  let vpHeight = $state(1080)

  // Sync from doc when it syncs
  $effect(() => {
    if (doc.synced) {
      fontInput = doc.font || ''
      bgColorInput = doc.effectiveBackgroundColor
      textColorInput = doc.effectiveTextColor
      const vp = doc.viewport
      if (vp) {
        vpX = vp.x
        vpY = vp.y
        vpWidth = vp.width
        vpHeight = vp.height
      }
    }
  })

  // Title from meta
  let titleInput = $state('')
  $effect(() => {
    if (doc.synced) {
      titleInput = (doc.meta.get('title') as string) || ''
    }
  })

  let titleTimeout: ReturnType<typeof setTimeout> | undefined
  function handleTitleChange() {
    if (titleTimeout) clearTimeout(titleTimeout)
    titleTimeout = setTimeout(() => {
      if (doc.synced && !doc.readOnly && !doc.isSystemTheme) {
        doc.meta.set('title', titleInput)
      }
    }, 300)
  }

  function handleFontChange() {
    if (doc.synced && !doc.readOnly && !doc.isSystemTheme) {
      doc.setFont(fontInput)
    }
  }

  function handleBgColorChange() {
    if (doc.synced && !doc.readOnly && !doc.isSystemTheme) {
      doc.setBackgroundColor(bgColorInput)
    }
  }

  function handleTextColorChange() {
    if (doc.synced && !doc.readOnly && !doc.isSystemTheme) {
      doc.setTextColor(textColorInput)
    }
  }

  function handleViewportChange() {
    if (doc.synced && !doc.readOnly && !doc.isSystemTheme) {
      doc.setViewport({ x: vpX, y: vpY, width: vpWidth, height: vpHeight })
    }
  }

  async function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const buffer = await file.arrayBuffer()
    doc.setBackgroundImage(new Uint8Array(buffer))
    toast('success', 'Background image uploaded')
  }

  function removeImage() {
    doc.setBackgroundImage(null)
  }

  // Delete handling
  let deleting = $state(false)
  let showDeleteDialog = $state(false)

  async function confirmDelete() {
    if (!auth.userChannel) return
    deleting = true
    showDeleteDialog = false
    try {
      await auth.userChannel.deleteDocument(documentId)
      toast('success', 'Theme deleted')
      await goto(resolve('/themes'))
    } catch {
      toast('error', 'Failed to delete theme')
      deleting = false
    }
  }

  const isEditable = $derived(doc.synced && !doc.readOnly && !doc.isSystemTheme)

  // WCAG contrast ratio calculation
  function hexToRgb(hex: string): [number, number, number] | null {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
    if (!m) return null
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
  }

  function relativeLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  function contrastRatio(hex1: string, hex2: string): number | null {
    const rgb1 = hexToRgb(hex1)
    const rgb2 = hexToRgb(hex2)
    if (!rgb1 || !rgb2) return null
    const l1 = relativeLuminance(...rgb1)
    const l2 = relativeLuminance(...rgb2)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  }

  const contrast = $derived(contrastRatio(bgColorInput, textColorInput))
  const contrastPassesAA = $derived(contrast !== null && contrast >= 4.5)

  const fontOptions = [
    'sans-serif',
    'serif',
    'monospace',
    'Georgia',
    'Palatino',
    'Garamond',
    'Arial',
    'Verdana',
    'Helvetica',
    'Courier New',
    'Trebuchet MS',
    'Impact',
  ]

  onDestroy(() => {
    if (titleTimeout) clearTimeout(titleTimeout)
    doc.destroy()
  })
</script>

<svelte:head>
  <title>Edit: {doc.synced ? titleInput || 'Untitled' : 'Loading...'} - Theme</title>
</svelte:head>

<div class="flex h-screen flex-col">
  <h1 class="sr-only">Edit Theme</h1>
  <!-- Header -->
  <header class="navbar min-h-0 border-b border-base-300 bg-base-200 px-4 py-2">
    <div class="flex flex-1 items-center gap-2">
      <a href={resolve('/themes')} class="btn btn-ghost btn-sm">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Themes
      </a>
      <input
        type="text"
        bind:value={titleInput}
        oninput={handleTitleChange}
        placeholder="Untitled Theme"
        class="input w-auto input-ghost text-lg font-medium"
        disabled={!isEditable} />
      {#if doc.isSystemTheme}
        <span class="badge badge-ghost">System Theme (Read Only)</span>
      {/if}
    </div>

    <div class="flex flex-none items-center gap-4">
      {#if !doc.isSystemTheme}
        <button
          type="button"
          onclick={() => (showDeleteDialog = true)}
          disabled={deleting}
          class="btn btn-outline btn-sm btn-error">
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      {/if}
    </div>
  </header>

  <!-- Content -->
  <main class="flex-1 overflow-y-auto">
    {#if doc.syncTimedOut}
      <div class="flex h-full flex-col items-center justify-center gap-4">
        <p class="text-base-content/70">Failed to connect to the document.</p>
        <button type="button" onclick={() => doc.retry()} class="btn btn-sm btn-primary">Retry</button>
      </div>
    {:else if !doc.synced}
      <div class="flex h-full items-center justify-center">
        <span class="loading loading-lg loading-spinner" role="status" aria-label="Loading"></span>
      </div>
    {:else}
      <div class="mx-auto max-w-4xl space-y-8 p-6">
        <!-- Live Preview -->
        <section>
          <h2 class="mb-3 text-lg font-semibold">Preview</h2>
          <div
            class="flex h-48 items-center justify-center rounded-lg border border-base-300 p-8"
            style="background-color: {doc.effectiveBackgroundColor}; color: {doc.effectiveTextColor}; font-family: {doc.effectiveFont};">
            <div class="text-center">
              <h3 class="mb-2 text-2xl font-bold">Sample Heading</h3>
              <p>This is how your theme will look.</p>
            </div>
          </div>
        </section>

        <!-- Colors -->
        <section>
          <h2 class="mb-3 text-lg font-semibold">Colors</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label" for="bg-color">
                <span class="label-text">Background Color</span>
              </label>
              <div class="flex gap-2">
                <input
                  id="bg-color"
                  type="color"
                  bind:value={bgColorInput}
                  onchange={handleBgColorChange}
                  disabled={!isEditable}
                  class="h-10 w-14 cursor-pointer rounded border border-base-300" />
                <input
                  type="text"
                  bind:value={bgColorInput}
                  onchange={handleBgColorChange}
                  disabled={!isEditable}
                  class="input-bordered input input-sm flex-1 font-mono" />
              </div>
            </div>
            <div class="form-control">
              <label class="label" for="text-color">
                <span class="label-text">Text Color</span>
              </label>
              <div class="flex gap-2">
                <input
                  id="text-color"
                  type="color"
                  bind:value={textColorInput}
                  onchange={handleTextColorChange}
                  disabled={!isEditable}
                  class="h-10 w-14 cursor-pointer rounded border border-base-300" />
                <input
                  type="text"
                  bind:value={textColorInput}
                  onchange={handleTextColorChange}
                  disabled={!isEditable}
                  class="input-bordered input input-sm flex-1 font-mono" />
              </div>
            </div>
          </div>
          {#if contrast !== null}
            <div class="mt-3 flex items-center gap-2">
              <span class="text-sm font-medium">Contrast ratio:</span>
              <span class="font-mono text-sm {contrastPassesAA ? 'text-success' : 'text-warning'}">
                {contrast.toFixed(1)}:1
              </span>
              {#if contrastPassesAA}
                <span class="badge badge-sm badge-success">WCAG AA</span>
              {:else}
                <span class="badge badge-sm badge-warning">Below WCAG AA (4.5:1)</span>
              {/if}
            </div>
          {/if}
        </section>

        <!-- Font -->
        <section>
          <h2 class="mb-3 text-lg font-semibold">Font</h2>
          <select
            class="select-bordered select w-full max-w-xs"
            bind:value={fontInput}
            onchange={handleFontChange}
            disabled={!isEditable}>
            <option value="">Default (sans-serif)</option>
            {#each fontOptions as fontOption}
              <option value={fontOption} style="font-family: {fontOption}">{fontOption}</option>
            {/each}
          </select>
        </section>

        <!-- Viewport -->
        <section>
          <h2 class="mb-3 text-lg font-semibold">Viewport Area</h2>
          <div class="grid grid-cols-4 gap-3">
            <div class="form-control">
              <label class="label" for="vp-x"><span class="label-text">X</span></label>
              <input
                id="vp-x"
                type="number"
                bind:value={vpX}
                onchange={handleViewportChange}
                disabled={!isEditable}
                class="input-bordered input input-sm" />
            </div>
            <div class="form-control">
              <label class="label" for="vp-y"><span class="label-text">Y</span></label>
              <input
                id="vp-y"
                type="number"
                bind:value={vpY}
                onchange={handleViewportChange}
                disabled={!isEditable}
                class="input-bordered input input-sm" />
            </div>
            <div class="form-control">
              <label class="label" for="vp-width"><span class="label-text">Width</span></label>
              <input
                id="vp-width"
                type="number"
                bind:value={vpWidth}
                onchange={handleViewportChange}
                disabled={!isEditable}
                class="input-bordered input input-sm" />
            </div>
            <div class="form-control">
              <label class="label" for="vp-height"><span class="label-text">Height</span></label>
              <input
                id="vp-height"
                type="number"
                bind:value={vpHeight}
                onchange={handleViewportChange}
                disabled={!isEditable}
                class="input-bordered input input-sm" />
            </div>
          </div>
        </section>

        <!-- Background Image -->
        <section>
          <h2 class="mb-3 text-lg font-semibold">Background Image</h2>
          {#if doc.backgroundImage}
            <div class="space-y-2">
              <p class="text-sm text-base-content/70">
                Image set ({(doc.backgroundImage.length / 1024).toFixed(1)} KB)
              </p>
              {#if isEditable}
                <button type="button" onclick={removeImage} class="btn btn-outline btn-sm btn-error">
                  Remove Image
                </button>
              {/if}
            </div>
          {:else if isEditable}
            <input
              type="file"
              accept="image/*"
              onchange={handleImageUpload}
              class="file-input-bordered file-input w-full max-w-xs" />
          {:else}
            <p class="text-sm text-base-content/50">No background image</p>
          {/if}
        </section>
      </div>
    {/if}
  </main>
</div>

{#if showDeleteDialog}
  <ConfirmDialog
    title="Delete Theme"
    message={'Are you sure you want to delete "' + (titleInput || 'Untitled') + '"? This action cannot be undone.'}
    onConfirm={confirmDelete}
    onCancel={() => (showDeleteDialog = false)} />
{/if}
