/**
 * Svelte action that traps focus within a container element.
 * Focus cycles between the first and last focusable elements on Tab/Shift+Tab.
 * Restores focus to the previously focused element on destroy.
 */
export function focusTrap(node: HTMLElement) {
  const previouslyFocused = document.activeElement as HTMLElement | null

  const focusableSelector =
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

  function getFocusableElements(): HTMLElement[] {
    return Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return

    const focusable = getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  // Focus first focusable element
  requestAnimationFrame(() => {
    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      focusable[0].focus()
    }
  })

  node.addEventListener('keydown', handleKeydown)

  return {
    destroy() {
      node.removeEventListener('keydown', handleKeydown)
      previouslyFocused?.focus()
    },
  }
}
