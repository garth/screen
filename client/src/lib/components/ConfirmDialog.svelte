<script lang="ts">
  import { focusTrap } from '$lib/actions/focus-trap'

  let {
    title,
    message,
    confirmLabel = 'Delete',
    onConfirm,
    onCancel,
  }: {
    title: string
    message: string
    confirmLabel?: string
    onConfirm: () => void
    onCancel: () => void
  } = $props()

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onCancel()
  }
</script>

<div
  class="modal-open modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-dialog-title"
  onkeydown={handleKeydown}
  use:focusTrap>
  <div class="modal-box">
    <h3 id="confirm-dialog-title" class="text-lg font-bold">{title}</h3>
    <p class="py-4 text-base-content/70">{message}</p>
    <div class="modal-action">
      <button type="button" onclick={onCancel} class="btn btn-ghost">Cancel</button>
      <button type="button" onclick={onConfirm} class="btn btn-error">{confirmLabel}</button>
    </div>
  </div>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={onCancel}></div>
</div>
