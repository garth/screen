<script lang="ts">
  import type { NavigationPoint } from '$lib/utils/point-parser'

  interface Props {
    points: NavigationPoint[]
    currentIndex: number
    onNavigate: (index: number) => void
  }

  let { points, currentIndex, onNavigate }: Props = $props()

  function goPrevious() {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1)
    }
  }

  function goNext() {
    if (currentIndex < points.length - 1) {
      onNavigate(currentIndex + 1)
    }
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
      {currentIndex + 1} / {points.length}
    </span>

    <button
      onclick={goNext}
      disabled={currentIndex === points.length - 1}
      class="rounded border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50">
      Next &rarr;
    </button>
  </div>

  <!-- Points List -->
  <div class="max-h-[50vh] overflow-y-auto rounded border border-gray-700 bg-gray-800/50">
    {#each points as point (point.index)}
      <button
        onclick={() => onNavigate(point.index)}
        class="w-full px-3 py-2 text-left transition-colors {point.index === currentIndex
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700'}"
        style:padding-left="{(point.level - 1) * 1 + 0.75}rem">
        <span class="text-xs text-gray-500 mr-2">{point.index + 1}.</span>
        {point.label}
      </button>
    {/each}
  </div>
</div>
