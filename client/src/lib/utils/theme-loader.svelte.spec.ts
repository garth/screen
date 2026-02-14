import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track mock theme documents for assertion access
const mockThemeDocs: Array<{ destroy: ReturnType<typeof vi.fn> }> = []

vi.mock('$lib/stores/documents', () => ({
  createThemeDoc: vi.fn(({ documentId }: { documentId: string }) => {
    const doc = { documentId, destroy: vi.fn() }
    mockThemeDocs.push(doc)
    return doc
  }),
}))

import { createTestHarness } from './theme-loader-test-harness.svelte'
import { createThemeDoc } from '$lib/stores/documents'

const mockedCreateThemeDoc = vi.mocked(createThemeDoc)

// Helper to flush pending Svelte effects
const flush = () => new Promise((r) => setTimeout(r, 10))

describe('createThemeLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockThemeDocs.length = 0
  })

  it('does not create theme doc when not synced', async () => {
    const harness = createTestHarness()
    await flush()

    expect(mockedCreateThemeDoc).not.toHaveBeenCalled()
    expect(harness.current).toBeNull()

    harness.cleanup()
  })

  it('does not create theme doc when synced without themeId', async () => {
    const harness = createTestHarness()
    harness.synced = true
    await flush()

    expect(mockedCreateThemeDoc).not.toHaveBeenCalled()
    expect(harness.current).toBeNull()

    harness.cleanup()
  })

  it('creates theme doc when synced with themeId', async () => {
    const harness = createTestHarness()
    harness.synced = true
    harness.themeId = 'theme-1'
    await flush()

    expect(mockedCreateThemeDoc).toHaveBeenCalledOnce()
    expect(mockedCreateThemeDoc).toHaveBeenCalledWith({ documentId: 'theme-1' })
    expect(harness.current).toStrictEqual(mockThemeDocs[0])

    harness.cleanup()
  })

  it('destroys old theme doc when themeId changes', async () => {
    const harness = createTestHarness()
    harness.synced = true
    harness.themeId = 'theme-1'
    await flush()

    const firstDoc = mockThemeDocs[0]

    harness.themeId = 'theme-2'
    await flush()

    expect(firstDoc.destroy).toHaveBeenCalled()
    expect(mockedCreateThemeDoc).toHaveBeenCalledTimes(2)
    expect(mockedCreateThemeDoc).toHaveBeenLastCalledWith({ documentId: 'theme-2' })
    expect(harness.current).toStrictEqual(mockThemeDocs[1])

    harness.cleanup()
  })

  it('destroys theme doc and sets null when themeId is cleared', async () => {
    const harness = createTestHarness()
    harness.synced = true
    harness.themeId = 'theme-1'
    await flush()

    const doc = mockThemeDocs[0]

    harness.themeId = null
    await flush()

    expect(doc.destroy).toHaveBeenCalled()
    expect(harness.current).toBeNull()

    harness.cleanup()
  })

  it('creates theme doc only once per change (untrack prevents infinite loop)', async () => {
    const harness = createTestHarness()
    harness.synced = true
    harness.themeId = 'theme-1'
    await flush()

    // Without untrack, the effect would loop infinitely because:
    // 1. Effect reads themeDoc (for destroy) - tracked dependency
    // 2. Effect writes themeDoc = createThemeDoc(...) - updates the dependency
    // 3. Effect re-runs - infinite loop -> effect_update_depth_exceeded
    // With untrack, the destroy read is not tracked, so the write doesn't re-trigger.
    expect(mockedCreateThemeDoc).toHaveBeenCalledTimes(1)

    harness.cleanup()
  })

  it('cleanup destroys current theme doc', async () => {
    const harness = createTestHarness()
    harness.synced = true
    harness.themeId = 'theme-1'
    await flush()

    const doc = mockThemeDocs[0]

    harness.cleanup()

    expect(doc.destroy).toHaveBeenCalled()
  })
})
