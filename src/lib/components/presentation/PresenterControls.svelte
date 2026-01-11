<script lang="ts">
  import type { ContentSegment } from '$lib/utils/segment-parser'

  interface Props {
    segments: ContentSegment[]
    currentIndex: number
    onNavigate: (index: number) => void
    onNavigateById?: (segmentId: string) => void
  }

  let { segments, currentIndex, onNavigate, onNavigateById }: Props = $props()

  function handleSegmentClick(segment: ContentSegment) {
    if (onNavigateById) {
      onNavigateById(segment.id)
    } else {
      onNavigate(segment.index)
    }
  }

  function goPrevious() {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1)
    }
  }

  function goNext() {
    if (currentIndex < segments.length - 1) {
      onNavigate(currentIndex + 1)
    }
  }

  // Get icon for segment type
  function getSegmentIcon(type: ContentSegment['type']): string {
    switch (type) {
      case 'heading':
        return 'H'
      case 'paragraph':
        return 'P'
      case 'list-item':
        return '\u2022' // bullet
      case 'image':
        return '\u{1F5BC}' // frame with picture
      case 'blockquote':
        return '\u201C' // opening quote
      case 'sentence':
        return '\u2026' // ellipsis
      default:
        return '\u2022'
    }
  }

  // Get indentation level for segment type
  function getIndentLevel(segment: ContentSegment): number {
    if (segment.type === 'heading') {
      return (segment.level ?? 1) - 1
    }
    if (segment.type === 'list-item' || segment.type === 'sentence') {
      return 1
    }
    return 0
  }
</script>

<div class="presenter-controls flex flex-col gap-4">
  <!-- Navigation Header -->
  <div class="flex items-center justify-between">
    <button
      onclick={goPrevious}
      disabled={currentIndex === 0}
      class="rounded border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50">
      &larr; Previous
    </button>

    <span class="text-gray-400">
      {currentIndex + 1} / {segments.length}
    </span>

    <button
      onclick={goNext}
      disabled={currentIndex === segments.length - 1}
      class="rounded border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50">
      Next &rarr;
    </button>
  </div>

  <!-- Segments List -->
  <div class="max-h-[50vh] overflow-y-auto rounded border border-gray-700 bg-gray-800/50">
    {#each segments as segment (segment.id)}
      <button
        onclick={() => handleSegmentClick(segment)}
        class="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors {segment.index === currentIndex ?
          'bg-blue-600 text-white'
        : 'text-gray-300 hover:bg-gray-700'}"
        style:padding-left="{getIndentLevel(segment) * 0.75 + 0.75}rem">
        <span class="w-4 flex-shrink-0 text-center text-xs opacity-60">{getSegmentIcon(segment.type)}</span>
        <span class="flex-shrink-0 text-xs opacity-50">{segment.index + 1}.</span>
        <span class="truncate">{segment.label}</span>
      </button>
    {/each}
  </div>
</div>
