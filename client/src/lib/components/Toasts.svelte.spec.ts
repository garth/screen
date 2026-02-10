import { page } from 'vitest/browser'
import { describe, expect, it, beforeEach } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Toasts from './Toasts.svelte'
import { toast, toastStore } from '$lib/toast.svelte'

describe('Toasts', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    toastStore.items.forEach((t) => toastStore.dismiss(t.id))
  })

  it('renders success toast with success styling', async () => {
    render(Toasts)
    toast('success', 'Operation successful', 10000)

    const alert = page.getByRole('alert')
    await expect.element(alert).toBeInTheDocument()
    await expect.element(alert).toHaveTextContent('Operation successful')
    await expect.element(alert).toHaveClass(/alert-success/)
  })

  it('renders error toast with error styling', async () => {
    render(Toasts)
    toast('error', 'Something went wrong', 10000)

    const alert = page.getByRole('alert')
    await expect.element(alert).toBeInTheDocument()
    await expect.element(alert).toHaveTextContent('Something went wrong')
    await expect.element(alert).toHaveClass(/alert-error/)
  })

  it('shows dismiss button on each toast', async () => {
    render(Toasts)
    toast('success', 'Test message')

    const dismissButton = page.getByRole('button', { name: 'Dismiss' })
    await expect.element(dismissButton).toBeInTheDocument()
  })

  it('dismisses toast when clicking dismiss button', async () => {
    render(Toasts)
    toast('success', 'Dismissable message', 10000) // Long duration to prevent auto-dismiss

    const alert = page.getByRole('alert')
    await expect.element(alert).toBeInTheDocument()

    const dismissButton = page.getByRole('button', { name: 'Dismiss' })
    await dismissButton.click()

    await expect.element(alert).not.toBeInTheDocument()
  })

  it('renders multiple toasts', async () => {
    render(Toasts)
    toast('success', 'First message', 10000)
    toast('error', 'Second message', 10000)

    const alerts = page.getByRole('alert')
    await expect.element(alerts.first()).toBeInTheDocument()
    await expect.element(alerts.nth(1)).toBeInTheDocument()
  })
})
