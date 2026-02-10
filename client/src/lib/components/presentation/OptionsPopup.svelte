<script lang="ts">
  import { focusTrap } from '$lib/actions/focus-trap'
  import type { PresentationFormat } from '$lib/stores/documents/types'

  interface Theme {
    id: string
    name: string
    isSystemTheme?: boolean
  }

  interface Props {
    open: boolean
    themes: Theme[]
    currentThemeId: string | null
    currentFormat: PresentationFormat
    disabled?: boolean
    onThemeChange: (themeId: string | null) => void
    onFormatChange: (format: PresentationFormat) => void
    onClose: () => void
  }

  let {
    open,
    themes,
    currentThemeId,
    currentFormat,
    disabled = false,
    onThemeChange,
    onFormatChange,
    onClose,
  }: Props = $props()

  function handleThemeChange(event: Event) {
    const target = event.target as HTMLSelectElement
    const themeId = target.value || null
    onThemeChange(themeId)
  }

  function handleFormatChange(format: PresentationFormat) {
    onFormatChange(format)
  }

  const formatOptions: { value: PresentationFormat; label: string; description: string }[] = [
    {
      value: 'single',
      label: 'Single',
      description: 'Show one segment at a time',
    },
    {
      value: 'minimal',
      label: 'Minimal',
      description: 'Navigate 2 segments at a time, like slides',
    },
    {
      value: 'block',
      label: 'Block',
      description: 'Show a contiguous block of content per slide',
    },
    {
      value: 'maximal',
      label: 'Maximal',
      description: 'Show current segment and merge group',
    },
    {
      value: 'scrolling',
      label: 'Scrolling',
      description: 'All segments with fading on past content',
    },
  ]
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-open modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="options-dialog-title"
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose()
    }}
    use:focusTrap>
    <div class="modal-box max-w-md">
      <h3 id="options-dialog-title" class="mb-4 text-lg font-bold">Presentation Options</h3>

      <!-- Theme Picker -->
      <div class="form-control mb-6">
        <label for="theme-select" class="label">
          <span class="label-text font-medium">Theme</span>
        </label>
        <select id="theme-select" onchange={handleThemeChange} {disabled} class="select-bordered select w-full">
          <option value="" selected={!currentThemeId}>No theme</option>
          {#each themes as theme (theme.id)}
            <option value={theme.id} selected={currentThemeId === theme.id}>
              {theme.name}
              {#if theme.isSystemTheme}(System){/if}
            </option>
          {/each}
        </select>
      </div>

      <!-- Format Selector -->
      <fieldset class="form-control">
        <legend class="label">
          <span class="label-text font-medium">Display Format</span>
        </legend>
        <div class="flex flex-col gap-2">
          {#each formatOptions as option (option.value)}
            <label
              class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors {(
                currentFormat === option.value
              ) ?
                'border-primary bg-primary/5'
              : 'border-base-300 hover:border-base-content/30'}">
              <input
                type="radio"
                name="format"
                value={option.value}
                checked={currentFormat === option.value}
                {disabled}
                onchange={() => handleFormatChange(option.value)}
                class="radio mt-0.5 radio-primary" />
              <div class="flex-1">
                <div class="font-medium">{option.label}</div>
                <div class="text-sm text-base-content/60">{option.description}</div>
              </div>
            </label>
          {/each}
        </div>
      </fieldset>

      <div class="modal-action">
        <button type="button" onclick={onClose} class="btn">Close</button>
      </div>
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={onClose}></div>
  </div>
{/if}
