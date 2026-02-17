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
    isPublic: boolean
    sharingLoading?: boolean
    disabled?: boolean
    onThemeChange: (themeId: string | null) => void
    onFormatChange: (format: PresentationFormat) => void
    onToggleSharing: () => void
    onClose: () => void
  }

  let {
    open,
    themes,
    currentThemeId,
    currentFormat,
    isPublic,
    sharingLoading = false,
    disabled = false,
    onThemeChange,
    onFormatChange,
    onToggleSharing,
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

  const formatOptions: { value: PresentationFormat; label: string }[] = [
    { value: 'single', label: 'Single' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'block', label: 'Block' },
    { value: 'maximal', label: 'Maximal' },
    { value: 'scrolling', label: 'Scrolling' },
  ]
</script>

{#if open}
  <div
    class="modal-open modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="options-dialog-title"
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose()
    }}
    use:focusTrap>
    <div class="modal-box flex max-h-[90vh] max-w-md flex-col overflow-hidden p-0 lg:max-w-lg">
      <!-- Fixed header -->
      <div class="flex items-center justify-between border-b border-base-300 px-6 py-4">
        <h3 id="options-dialog-title" class="text-lg font-bold">Presentation Options</h3>
        <button type="button" onclick={onClose} class="btn btn-circle btn-ghost btn-sm" aria-label="Close">
          <span class="hero-x-mark-mini size-5" aria-hidden="true"></span>
        </button>
      </div>

      <!-- Scrollable content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
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
        <fieldset class="form-control mb-6">
          <legend class="label">
            <span class="label-text font-medium">Slide Layout</span>
          </legend>
          <div class="grid grid-cols-5 gap-2">
            {#each formatOptions as option (option.value)}
              <label
                class="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors {(
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
                  class="sr-only" />
                <svg class="h-10 w-full" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  {#if option.value === 'single'}
                    <!-- Single bar centered -->
                    <rect x="4" y="17" width="32" height="6" rx="1" fill="currentColor" opacity="0.7" />
                  {:else if option.value === 'minimal'}
                    <!-- Two bars -->
                    <rect x="4" y="12" width="32" height="6" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="4" y="22" width="32" height="6" rx="1" fill="currentColor" opacity="0.7" />
                  {:else if option.value === 'block'}
                    <!-- Solid block of bars -->
                    <rect x="4" y="9" width="32" height="5" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="4" y="17" width="24" height="5" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="4" y="25" width="32" height="5" rx="1" fill="currentColor" opacity="0.7" />
                  {:else if option.value === 'maximal'}
                    <!-- Multiple bars separated by gaps -->
                    <rect x="4" y="5" width="32" height="5" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="4" y="18" width="24" height="5" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="4" y="31" width="28" height="5" rx="1" fill="currentColor" opacity="0.7" />
                  {:else if option.value === 'scrolling'}
                    <!-- Bars fading in and out, 2 bright blocks in center -->
                    <rect x="4" y="2" width="28" height="5" rx="1" fill="currentColor" opacity="0.08" />
                    <rect x="4" y="9" width="32" height="5" rx="1" fill="currentColor" opacity="0.2" />
                    <rect x="4" y="16" width="24" height="5" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="4" y="23" width="32" height="5" rx="1" fill="currentColor" opacity="0.7" />
                    <rect x="4" y="30" width="18" height="5" rx="1" fill="currentColor" opacity="0.2" />
                    <rect x="4" y="37" width="28" height="5" rx="1" fill="currentColor" opacity="0.08" />
                  {/if}
                </svg>
                <span class="text-xs">{option.label}</span>
              </label>
            {/each}
          </div>
        </fieldset>

        <!-- Sharing Toggle -->
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Visibility</span>
          </label>
          <label class="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              class="toggle toggle-primary"
              checked={isPublic}
              disabled={sharingLoading || disabled}
              onchange={onToggleSharing} />
            <span>{isPublic ? 'Public — anyone with the link can view' : 'Private — only you can access'}</span>
          </label>
        </div>
      </div>
    </div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={onClose}></div>
  </div>
{/if}
