import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { toastStore, toast, dismiss } from './toast.svelte'

describe('toastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Clear any existing toasts
    for (const t of [...toastStore.items]) {
      toastStore.dismiss(t.id)
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('add', () => {
    it('adds a toast with generated ID', () => {
      toastStore.add('success', 'Test message')

      expect(toastStore.items).toHaveLength(1)
      expect(toastStore.items[0]).toMatchObject({
        type: 'success',
        message: 'Test message',
      })
      expect(toastStore.items[0].id).toBeDefined()
    })

    it('adds multiple toasts', () => {
      toastStore.add('success', 'First')
      toastStore.add('error', 'Second')

      expect(toastStore.items).toHaveLength(2)
      expect(toastStore.items[0].message).toBe('First')
      expect(toastStore.items[1].message).toBe('Second')
    })

    it('generates unique IDs for each toast', () => {
      toastStore.add('success', 'First')
      toastStore.add('success', 'Second')

      expect(toastStore.items[0].id).not.toBe(toastStore.items[1].id)
    })

    it('auto-dismisses after default duration (3000ms)', () => {
      toastStore.add('success', 'Auto-dismiss test')

      expect(toastStore.items).toHaveLength(1)

      vi.advanceTimersByTime(2999)
      expect(toastStore.items).toHaveLength(1)

      vi.advanceTimersByTime(1)
      expect(toastStore.items).toHaveLength(0)
    })

    it('auto-dismisses after custom duration', () => {
      toastStore.add('success', 'Custom duration', 5000)

      expect(toastStore.items).toHaveLength(1)

      vi.advanceTimersByTime(4999)
      expect(toastStore.items).toHaveLength(1)

      vi.advanceTimersByTime(1)
      expect(toastStore.items).toHaveLength(0)
    })

    it('supports success type', () => {
      toastStore.add('success', 'Success message')
      expect(toastStore.items[0].type).toBe('success')
    })

    it('supports error type', () => {
      toastStore.add('error', 'Error message')
      expect(toastStore.items[0].type).toBe('error')
    })
  })

  describe('dismiss', () => {
    it('removes a toast by ID', () => {
      toastStore.add('success', 'To be dismissed')
      const id = toastStore.items[0].id

      toastStore.dismiss(id)

      expect(toastStore.items).toHaveLength(0)
    })

    it('only removes the specified toast', () => {
      toastStore.add('success', 'First')
      toastStore.add('success', 'Second')
      const firstId = toastStore.items[0].id

      toastStore.dismiss(firstId)

      expect(toastStore.items).toHaveLength(1)
      expect(toastStore.items[0].message).toBe('Second')
    })

    it('does nothing if ID not found', () => {
      toastStore.add('success', 'Test')

      toastStore.dismiss('non-existent-id')

      expect(toastStore.items).toHaveLength(1)
    })
  })

  describe('items getter', () => {
    it('returns empty array initially', () => {
      // Clear first
      for (const t of [...toastStore.items]) {
        toastStore.dismiss(t.id)
      }
      expect(toastStore.items).toEqual([])
    })

    it('returns current toasts', () => {
      toastStore.add('success', 'Test')
      expect(toastStore.items).toHaveLength(1)
    })
  })
})

describe('toast helper function', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    for (const t of [...toastStore.items]) {
      toastStore.dismiss(t.id)
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds a toast via the helper', () => {
    toast('success', 'Helper test')

    expect(toastStore.items).toHaveLength(1)
    expect(toastStore.items[0].message).toBe('Helper test')
  })

  it('supports custom duration', () => {
    toast('error', 'Quick toast', 1000)

    vi.advanceTimersByTime(1000)
    expect(toastStore.items).toHaveLength(0)
  })
})

describe('dismiss helper function', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    for (const t of [...toastStore.items]) {
      toastStore.dismiss(t.id)
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dismisses a toast via the helper', () => {
    toast('success', 'To dismiss')
    const id = toastStore.items[0].id

    dismiss(id)

    expect(toastStore.items).toHaveLength(0)
  })
})
