<script lang="ts">
  import { collapseMergedSegments, type ContentSegment, type CollapsedSegment } from '$lib/utils/segment-parser'

  interface Props {
    segments: ContentSegment[]
    currentIndex: number
    onNavigate: (index: number) => void
    onNavigateById?: (segmentId: string) => void
  }

  let { segments, currentIndex, onNavigate, onNavigateById }: Props = $props()

  // Collapse merged segments for display
  const collapsedSegments = $derived(collapseMergedSegments(segments))

  // Map the current segment to its collapsed index
  const currentCollapsedIndex = $derived.by(() => {
    if (currentIndex < 0 || currentIndex >= segments.length) return 0
    const currentSegment = segments[currentIndex]
    if (!currentSegment) return 0

    // Find which collapsed segment contains this segment
    for (let i = 0; i < collapsedSegments.length; i++) {
      const collapsed = collapsedSegments[i]
      if (collapsed.mergedSegmentIds) {
        if (collapsed.mergedSegmentIds.includes(currentSegment.id)) {
          return i
        }
      } else if (collapsed.id === currentSegment.id) {
        return i
      }
    }
    return 0
  })

  function handleSegmentClick(segment: CollapsedSegment) {
    if (onNavigateById) {
      onNavigateById(segment.id)
    } else {
      // Navigate to the first segment in the group
      const originalSegment = segments.find((s) => s.id === segment.id)
      if (originalSegment) {
        onNavigate(originalSegment.index)
      }
    }
  }

  function goPrevious() {
    if (currentCollapsedIndex > 0) {
      const prevSegment = collapsedSegments[currentCollapsedIndex - 1]
      handleSegmentClick(prevSegment)
    }
  }

  function goNext() {
    if (currentCollapsedIndex < collapsedSegments.length - 1) {
      const nextSegment = collapsedSegments[currentCollapsedIndex + 1]
      handleSegmentClick(nextSegment)
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
    <button onclick={goPrevious} disabled={currentCollapsedIndex === 0} class="btn btn-ghost btn-sm">
      &larr; Previous
    </button>

    <span class="text-base-content/50">
      {currentCollapsedIndex + 1} / {collapsedSegments.length}
    </span>

    <button
      onclick={goNext}
      disabled={currentCollapsedIndex === collapsedSegments.length - 1}
      class="btn btn-ghost btn-sm">
      Next &rarr;
    </button>
  </div>

  <!-- Segments List -->
  <div class="max-h-[50vh] overflow-y-auto rounded-box border border-base-300 bg-base-300/50">
    {#each collapsedSegments as segment (segment.id)}
      <button
        onclick={() => handleSegmentClick(segment)}
        class="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors {(
          segment.index === currentCollapsedIndex
        ) ?
          'bg-primary text-primary-content'
        : 'hover:bg-base-300'}"
        style:padding-left="{getIndentLevel(segment) * 0.75 + 0.75}rem">
        <span class="w-4 flex-shrink-0 text-center text-xs opacity-60">{getSegmentIcon(segment.type)}</span>
        <span class="flex-shrink-0 text-xs opacity-50">{segment.index + 1}.</span>
        <span class="truncate">{segment.label}</span>
        {#if segment.mergedCount && segment.mergedCount > 1}
          <span class="ml-auto badge flex-shrink-0 badge-sm badge-info">
            {segment.mergedCount} merged
          </span>
        {/if}
      </button>
    {/each}
  </div>
</div>
