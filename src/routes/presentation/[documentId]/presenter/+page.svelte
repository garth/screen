<script lang="ts">
  import { onDestroy } from 'svelte'
  import { browser } from '$app/environment'
  import { createPresentationDoc, createThemeDoc, type ThemeDocument } from '$lib/stores/documents'
  import PresentationViewer from '$lib/components/presentation/PresentationViewer.svelte'
  import PresenterControls from '$lib/components/presentation/PresenterControls.svelte'
  import { resolveTheme, defaultTheme, type ResolvedTheme } from '$lib/utils/theme-resolver'
  import { parseNavigationPoints, clampPointIndex, type NavigationPoint } from '$lib/utils/point-parser'

  let { data } = $props()

  // Create presentation document store
  const doc = createPresentationDoc({
    documentId: data.document.id,
    baseDocumentId: data.document.baseDocumentId ?? undefined,
  })

  // Theme document (loaded when themeId is available)
  let themeDoc = $state<ThemeDocument | null>(null)

  // Load theme when presentation syncs and has a themeId
  $effect(() => {
    if (doc.synced && doc.themeId) {
      themeDoc?.destroy()
      themeDoc = createThemeDoc({ documentId: doc.themeId })
    } else if (doc.synced && !doc.themeId) {
      themeDoc?.destroy()
      themeDoc = null
    }
  })

  // Compute resolved theme
  const resolvedTheme: ResolvedTheme = $derived(
    doc.synced
      ? resolveTheme(
          {
            font: doc.font,
            backgroundColor: doc.backgroundColor,
            textColor: doc.textColor,
          },
          themeDoc?.synced ? themeDoc : null,
        )
      : defaultTheme,
  )

  // Parse navigation points from content
  const navigationPoints: NavigationPoint[] = $derived(
    doc.synced ? parseNavigationPoints(doc.content) : [],
  )

  // Current navigation point index
  let currentPointIndex = $state(0)

  // Clamp index when points change
  $effect(() => {
    currentPointIndex = clampPointIndex(currentPointIndex, navigationPoints.length)
  })

  // Handle navigation
  function handleNavigate(index: number) {
    currentPointIndex = clampPointIndex(index, navigationPoints.length)
  }

  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        handleNavigate(currentPointIndex - 1)
        break
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        event.preventDefault()
        handleNavigate(currentPointIndex + 1)
        break
      case 'Home':
        event.preventDefault()
        handleNavigate(0)
        break
      case 'End':
        event.preventDefault()
        handleNavigate(navigationPoints.length - 1)
        break
      case 'Escape':
        // Could exit fullscreen or go back
        break
    }
  }

  // Add keyboard listener
  $effect(() => {
    if (browser) {
      window.addEventListener('keydown', handleKeydown)
      return () => {
        window.removeEventListener('keydown', handleKeydown)
      }
    }
  })

  onDestroy(() => {
    themeDoc?.destroy()
    doc.destroy()
  })
</script>

<svelte:head>
  <title>{data.document.title} - Presenter</title>
</svelte:head>

<div class="flex h-screen bg-gray-900">
  <!-- Main Presentation View -->
  <div class="flex flex-1 flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-3">
      <div class="flex items-center gap-4">
        <a href="/presentation/{data.document.id}/edit" class="text-gray-400 hover:text-gray-200">
          &larr; Back to Editor
        </a>
        <h1 class="text-lg font-medium text-gray-100">
          {doc.synced && doc.title ? doc.title : data.document.title || 'Untitled'}
        </h1>
      </div>

      <div class="flex items-center gap-2 text-sm text-gray-400">
        <span>Use arrow keys to navigate</span>
      </div>
    </header>

    <!-- Viewer -->
    <main class="flex-1 overflow-hidden">
      {#if doc.synced}
        <PresentationViewer
          content={doc.content}
          theme={resolvedTheme}
          mode="present"
          currentPoint={currentPointIndex}
          onPointClick={handleNavigate} />
      {:else}
        <div class="flex h-full items-center justify-center">
          <p class="text-gray-500">Loading presentation...</p>
        </div>
      {/if}
    </main>
  </div>

  <!-- Sidebar with Controls -->
  <aside class="w-80 border-l border-gray-700 bg-gray-800 p-4">
    {#if doc.synced && navigationPoints.length > 0}
      <PresenterControls
        points={navigationPoints}
        currentIndex={currentPointIndex}
        onNavigate={handleNavigate} />
    {:else if doc.synced}
      <div class="text-center text-gray-500">
        <p>No navigation points found.</p>
        <p class="mt-2 text-sm">Add headings to create slides.</p>
      </div>
    {:else}
      <div class="text-center text-gray-500">
        <p>Loading...</p>
      </div>
    {/if}
  </aside>
</div>
