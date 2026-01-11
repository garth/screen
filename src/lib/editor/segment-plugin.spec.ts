import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { presentationSchema } from './schema'
import { createSegmentPlugin, segmentPluginKey, getSegments } from './segment-plugin'

describe('createSegmentPlugin', () => {
  function createState(...paragraphTexts: string[]) {
    const paragraphs = paragraphTexts.map((text) => {
      if (text) {
        return presentationSchema.nodes.paragraph.create(
          null,
          presentationSchema.text(text)
        )
      }
      return presentationSchema.nodes.paragraph.create()
    })

    const doc = presentationSchema.nodes.doc.create(null, paragraphs)
    const plugin = createSegmentPlugin(presentationSchema)

    return EditorState.create({
      doc,
      schema: presentationSchema,
      plugins: [plugin],
    })
  }

  describe('plugin creation', () => {
    it('creates a plugin with the segment key', () => {
      const plugin = createSegmentPlugin(presentationSchema)
      // Plugin.key returns the key string, not the PluginKey object
      expect(plugin.spec.key).toBe(segmentPluginKey)
    })

    it('initializes with segment state', () => {
      const state = createState('Hello world')
      const pluginState = segmentPluginKey.getState(state)

      expect(pluginState).toBeDefined()
      expect(pluginState?.segments).toBeDefined()
      expect(pluginState?.decorations).toBeDefined()
    })
  })

  describe('segment ID assignment', () => {
    it('assigns segment IDs to new paragraphs on transaction', () => {
      const state = createState('Initial content')

      // Simulate adding a new paragraph
      const newPara = presentationSchema.nodes.paragraph.create(
        null,
        presentationSchema.text('New paragraph')
      )
      const tr = state.tr.insert(state.doc.content.size, newPara)
      const newState = state.apply(tr)

      // Get the new paragraph node
      let foundSegmentId = false
      newState.doc.descendants((node) => {
        if (node.type.name === 'paragraph' && node.attrs.segmentId) {
          foundSegmentId = true
        }
      })

      expect(foundSegmentId).toBe(true)
    })

    it('preserves existing segment IDs', () => {
      const existingId = 'seg-existing'
      const para = presentationSchema.nodes.paragraph.create(
        { segmentId: existingId },
        presentationSchema.text('Has ID')
      )
      const doc = presentationSchema.nodes.doc.create(null, para)
      const plugin = createSegmentPlugin(presentationSchema)
      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      // Apply a transaction that doesn't change the document
      const newState = state.apply(state.tr)

      let foundId: string | null = null
      newState.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          foundId = node.attrs.segmentId
        }
      })

      expect(foundId).toBe(existingId)
    })
  })

  describe('sentence splitting', () => {
    it('splits long paragraphs into sentence nodes', () => {
      const longText =
        'This is the first sentence with enough content. This is the second sentence that continues. And here is a third sentence to make it longer!'
      const state = createState(longText)

      // The plugin should split this on the next transaction
      const tr = state.tr.insertText(' ', 1) // Minor edit to trigger
      const newState = state.apply(tr)

      let hasSentenceNode = false
      newState.doc.descendants((node) => {
        if (node.type.name === 'sentence') {
          hasSentenceNode = true
        }
      })

      expect(hasSentenceNode).toBe(true)
    })

    it('does not split short paragraphs', () => {
      const shortText = 'Short text.'
      const state = createState(shortText)

      const tr = state.tr.insertText(' ', 1)
      const newState = state.apply(tr)

      let hasSentenceNode = false
      newState.doc.descendants((node) => {
        if (node.type.name === 'sentence') {
          hasSentenceNode = true
        }
      })

      expect(hasSentenceNode).toBe(false)
    })

    it('assigns derived IDs to sentence nodes', () => {
      // Create a paragraph WITHOUT segmentId - the plugin will assign one
      // Text must be >100 chars to trigger sentence splitting
      const longText =
        'This is the first sentence with quite a bit of content to make it longer. This is the second sentence that continues the paragraph. And here is the third one that makes it even longer than before!'
      const para = presentationSchema.nodes.paragraph.create(
        null, // No segmentId - plugin will assign
        presentationSchema.text(longText)
      )
      const doc = presentationSchema.nodes.doc.create(null, para)
      const plugin = createSegmentPlugin(presentationSchema)
      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      // First transaction assigns IDs and splits
      const tr = state.tr.insertText(' ', 1)
      const newState = state.apply(tr)

      const sentenceIds: string[] = []
      newState.doc.descendants((node) => {
        if (node.type.name === 'sentence' && node.attrs.segmentId) {
          sentenceIds.push(node.attrs.segmentId)
        }
      })

      // Should have sentence IDs with -s suffix
      expect(sentenceIds.length).toBeGreaterThan(1)
      sentenceIds.forEach((id) => {
        expect(id).toContain('-s')
      })
    })
  })

  describe('decorations', () => {
    it('creates decorations for segment nodes', () => {
      const para = presentationSchema.nodes.paragraph.create(
        { segmentId: 'seg-001' },
        presentationSchema.text('Decorated paragraph')
      )
      const doc = presentationSchema.nodes.doc.create(null, para)
      const plugin = createSegmentPlugin(presentationSchema)
      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      const pluginState = segmentPluginKey.getState(state)
      expect(pluginState?.decorations).toBeDefined()

      // Check that decorations exist
      const decorations = pluginState?.decorations.find(1, state.doc.content.size)
      expect(decorations?.length).toBeGreaterThan(0)
    })

    it('updates decorations when document changes', () => {
      const state = createState('Initial')

      const pluginState1 = segmentPluginKey.getState(state)
      const decorCount1 = pluginState1?.decorations.find(
        1,
        state.doc.content.size
      ).length

      // Add another paragraph
      const newPara = presentationSchema.nodes.paragraph.create(
        { segmentId: 'seg-new' },
        presentationSchema.text('New paragraph')
      )
      const tr = state.tr.insert(state.doc.content.size, newPara)
      const newState = state.apply(tr)

      const pluginState2 = segmentPluginKey.getState(newState)
      const decorCount2 = pluginState2?.decorations.find(
        1,
        newState.doc.content.size
      ).length

      // Should have more decorations after adding content
      expect(decorCount2).toBeGreaterThanOrEqual(decorCount1 || 0)
    })
  })
})

describe('getSegments', () => {
  it('returns segments from editor state', () => {
    const para = presentationSchema.nodes.paragraph.create(
      { segmentId: 'seg-001' },
      presentationSchema.text('Test paragraph')
    )
    const doc = presentationSchema.nodes.doc.create(null, para)
    const plugin = createSegmentPlugin(presentationSchema)
    const state = EditorState.create({
      doc,
      schema: presentationSchema,
      plugins: [plugin],
    })

    const segments = getSegments(state)

    expect(segments).toHaveLength(1)
    expect(segments[0].id).toBe('seg-001')
    expect(segments[0].type).toBe('paragraph')
  })

  it('returns empty array when plugin is not present', () => {
    const para = presentationSchema.nodes.paragraph.create()
    const doc = presentationSchema.nodes.doc.create(null, para)
    const state = EditorState.create({
      doc,
      schema: presentationSchema,
      plugins: [],
    })

    const segments = getSegments(state)

    expect(segments).toEqual([])
  })

  it('returns multiple segments in order', () => {
    const para1 = presentationSchema.nodes.paragraph.create(
      { segmentId: 'seg-001' },
      presentationSchema.text('First')
    )
    const para2 = presentationSchema.nodes.paragraph.create(
      { segmentId: 'seg-002' },
      presentationSchema.text('Second')
    )
    const doc = presentationSchema.nodes.doc.create(null, [para1, para2])
    const plugin = createSegmentPlugin(presentationSchema)
    const state = EditorState.create({
      doc,
      schema: presentationSchema,
      plugins: [plugin],
    })

    const segments = getSegments(state)

    expect(segments).toHaveLength(2)
    expect(segments[0].index).toBe(0)
    expect(segments[1].index).toBe(1)
  })
})
