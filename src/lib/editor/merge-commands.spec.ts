import { describe, expect, it } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { Node } from 'prosemirror-model'
import { presentationSchema } from './schema'
import { canMergeSegments, canUnmergeSegments, mergeSegments, unmergeSegments } from './merge-commands'

/**
 * Helper to create an editor state with content
 */
function createState(docContent: Node): EditorState {
  return EditorState.create({
    doc: docContent,
    schema: presentationSchema,
  })
}

/**
 * Helper to create a paragraph node with segmentId
 */
function para(text: string, segmentId: string, mergeGroupId?: string): Node {
  return presentationSchema.nodes.paragraph.create(
    { segmentId, mergeGroupId: mergeGroupId ?? null },
    text ? presentationSchema.text(text) : undefined,
  )
}

/**
 * Helper to create a heading node with segmentId
 */
function _heading(text: string, level: number, segmentId: string, mergeGroupId?: string): Node {
  return presentationSchema.nodes.heading.create(
    { level, segmentId, mergeGroupId: mergeGroupId ?? null },
    text ? presentationSchema.text(text) : undefined,
  )
}

/**
 * Create a state with selection spanning from start to end
 */
function createStateWithSelection(doc: Node, from: number, to: number): EditorState {
  const state = createState(doc)
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
}

describe('canMergeSegments', () => {
  it('returns false for empty selection', () => {
    const doc = presentationSchema.nodes.doc.create({}, [para('First', 'seg-1'), para('Second', 'seg-2')])
    const state = createState(doc)
    expect(canMergeSegments(state)).toBe(false)
  })

  it('returns false for single segment selection', () => {
    const doc = presentationSchema.nodes.doc.create({}, [para('First paragraph', 'seg-1'), para('Second', 'seg-2')])
    // Select within the first paragraph
    const state = createStateWithSelection(doc, 1, 5)
    expect(canMergeSegments(state)).toBe(false)
  })

  it('returns true when selection spans multiple segments', () => {
    const doc = presentationSchema.nodes.doc.create({}, [para('First', 'seg-1'), para('Second', 'seg-2')])
    // Select from first paragraph to second
    const state = createStateWithSelection(doc, 1, 13)
    expect(canMergeSegments(state)).toBe(true)
  })

  it('returns false when selection spans a slide divider', () => {
    const slideDivider = presentationSchema.nodes.slide_divider.create()
    const doc = presentationSchema.nodes.doc.create({}, [para('First', 'seg-1'), slideDivider, para('Second', 'seg-2')])
    // Select from first paragraph (slide 0) to second (slide 1)
    const state = createStateWithSelection(doc, 1, 14)
    expect(canMergeSegments(state)).toBe(false)
  })
})

describe('canUnmergeSegments', () => {
  it('returns false when cursor is not in a merged segment', () => {
    const doc = presentationSchema.nodes.doc.create({}, [para('First', 'seg-1'), para('Second', 'seg-2')])
    const state = createState(doc)
    expect(canUnmergeSegments(state)).toBe(false)
  })

  it('returns true when cursor is in a merged segment', () => {
    const doc = presentationSchema.nodes.doc.create({}, [
      para('First', 'seg-1', 'merge-group-1'),
      para('Second', 'seg-2', 'merge-group-1'),
    ])
    // Place cursor in first paragraph
    const state = createStateWithSelection(doc, 1, 1)
    expect(canUnmergeSegments(state)).toBe(true)
  })
})

describe('mergeSegments', () => {
  it('assigns same mergeGroupId to selected segments', () => {
    const doc = presentationSchema.nodes.doc.create({}, [
      para('First', 'seg-1'),
      para('Second', 'seg-2'),
      para('Third', 'seg-3'),
    ])
    // Select first two paragraphs
    const state = createStateWithSelection(doc, 1, 13)

    let resultState: EditorState | null = null
    const result = mergeSegments(state, (tr) => {
      resultState = state.apply(tr)
    })

    expect(result).toBe(true)
    expect(resultState).not.toBeNull()

    const newDoc = resultState!.doc
    const firstMergeGroupId = (newDoc.child(0) as Node).attrs.mergeGroupId
    const secondMergeGroupId = (newDoc.child(1) as Node).attrs.mergeGroupId
    const thirdMergeGroupId = (newDoc.child(2) as Node).attrs.mergeGroupId

    // First two should have the same mergeGroupId
    expect(firstMergeGroupId).toBeTruthy()
    expect(firstMergeGroupId).toBe(secondMergeGroupId)
    // Third should not be merged
    expect(thirdMergeGroupId).toBeNull()
  })

  it('returns false when segments cannot be merged', () => {
    const doc = presentationSchema.nodes.doc.create({}, [para('First', 'seg-1')])
    const state = createState(doc)
    expect(mergeSegments(state)).toBe(false)
  })
})

describe('unmergeSegments', () => {
  it('removes mergeGroupId from all segments in the group', () => {
    const doc = presentationSchema.nodes.doc.create({}, [
      para('First', 'seg-1', 'merge-group-1'),
      para('Second', 'seg-2', 'merge-group-1'),
      para('Third', 'seg-3'),
    ])
    // Place cursor in first paragraph
    const state = createStateWithSelection(doc, 1, 1)

    let resultState: EditorState | null = null
    const result = unmergeSegments(state, (tr) => {
      resultState = state.apply(tr)
    })

    expect(result).toBe(true)
    expect(resultState).not.toBeNull()

    const newDoc = resultState!.doc
    const firstMergeGroupId = (newDoc.child(0) as Node).attrs.mergeGroupId
    const secondMergeGroupId = (newDoc.child(1) as Node).attrs.mergeGroupId

    // Both should now be null
    expect(firstMergeGroupId).toBeNull()
    expect(secondMergeGroupId).toBeNull()
  })

  it('returns false when not in a merged segment', () => {
    const doc = presentationSchema.nodes.doc.create({}, [para('First', 'seg-1')])
    const state = createState(doc)
    expect(unmergeSegments(state)).toBe(false)
  })
})
