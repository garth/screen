import { describe, it, expect } from 'vitest'
import { EditorState } from 'prosemirror-state'
import { presentationSchema } from './schema'
import { createSegmentPlugin, segmentPluginKey, getSegments } from './segment-plugin'

describe('createSegmentPlugin', () => {
  function createState(...paragraphTexts: string[]) {
    const paragraphs = paragraphTexts.map((text) => {
      if (text) {
        return presentationSchema.nodes.paragraph.create(null, presentationSchema.text(text))
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
      const newPara = presentationSchema.nodes.paragraph.create(null, presentationSchema.text('New paragraph'))
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
        presentationSchema.text('Has ID'),
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

  describe('empty element handling', () => {
    it('does not assign segment IDs to empty paragraphs', () => {
      const state = createState('', 'Has content', '')

      // Apply a no-op transaction to trigger appendTransaction
      const newState = state.apply(state.tr)

      // Check that only non-empty paragraphs have segment IDs
      const paragraphs: { text: string; hasSegmentId: boolean }[] = []
      newState.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          paragraphs.push({
            text: node.textContent,
            hasSegmentId: !!node.attrs.segmentId,
          })
        }
      })

      expect(paragraphs).toHaveLength(3)
      expect(paragraphs[0].hasSegmentId).toBe(false) // empty
      expect(paragraphs[1].hasSegmentId).toBe(true) // has content
      expect(paragraphs[2].hasSegmentId).toBe(false) // empty
    })

    it('does not assign segment IDs to whitespace-only paragraphs', () => {
      const state = createState('   ', '\t\n', 'Real content')

      // Apply a no-op transaction to trigger appendTransaction
      const newState = state.apply(state.tr)

      const paragraphs: { text: string; hasSegmentId: boolean }[] = []
      newState.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          paragraphs.push({
            text: node.textContent,
            hasSegmentId: !!node.attrs.segmentId,
          })
        }
      })

      expect(paragraphs).toHaveLength(3)
      expect(paragraphs[0].hasSegmentId).toBe(false) // whitespace only
      expect(paragraphs[1].hasSegmentId).toBe(false) // whitespace only
      expect(paragraphs[2].hasSegmentId).toBe(true) // has content
    })

    it('removes segment ID when paragraph becomes empty', () => {
      // Create a paragraph with content and segment ID
      const para = presentationSchema.nodes.paragraph.create(
        { segmentId: 'seg-existing' },
        presentationSchema.text('Some content'),
      )
      const doc = presentationSchema.nodes.doc.create(null, para)
      const plugin = createSegmentPlugin(presentationSchema)
      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      // Delete all content from the paragraph
      const tr = state.tr.delete(1, state.doc.content.size - 1)
      const newState = state.apply(tr)

      // The paragraph should no longer have a segment ID
      let segmentId: string | null = null
      newState.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          segmentId = node.attrs.segmentId
        }
      })

      expect(segmentId).toBeNull()
    })

    it('removes merge group ID when paragraph becomes empty', () => {
      // Create a paragraph with content, segment ID, and merge group ID
      const para = presentationSchema.nodes.paragraph.create(
        { segmentId: 'seg-existing', mergeGroupId: 'merge-group-1' },
        presentationSchema.text('Some content'),
      )
      const doc = presentationSchema.nodes.doc.create(null, para)
      const plugin = createSegmentPlugin(presentationSchema)
      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      // Delete all content from the paragraph
      const tr = state.tr.delete(1, state.doc.content.size - 1)
      const newState = state.apply(tr)

      // The paragraph should no longer have segment ID or merge group ID
      let attrs: { segmentId: string | null; mergeGroupId: string | null } | null = null
      newState.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          attrs = { segmentId: node.attrs.segmentId, mergeGroupId: node.attrs.mergeGroupId }
        }
      })

      expect(attrs?.segmentId).toBeNull()
      expect(attrs?.mergeGroupId).toBeNull()
    })

    it('strips segment ID from images (paragraphs handle segmentation)', () => {
      // Images are inline — the parent paragraph is the segment unit
      const image = presentationSchema.nodes.image.create({
        segmentId: 'seg-image',
        src: 'test.jpg',
        alt: '',
      })
      const para = presentationSchema.nodes.paragraph.create(null, image)
      const doc = presentationSchema.nodes.doc.create(null, para)
      const plugin = createSegmentPlugin(presentationSchema)
      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      // Apply a transaction to trigger the plugin
      const newState = state.apply(state.tr)

      let imageSegmentId: string | null = null
      let paraSegmentId: string | null = null
      newState.doc.descendants((node) => {
        if (node.type.name === 'image') {
          imageSegmentId = node.attrs.segmentId
        }
        if (node.type.name === 'paragraph') {
          paraSegmentId = node.attrs.segmentId
        }
      })

      // Image should have its segment ID stripped
      expect(imageSegmentId).toBeNull()
      // Paragraph should have a segment ID (it has image content)
      expect(paraSegmentId).not.toBeNull()
    })

    it('assigns segment ID to paragraph containing only an image', () => {
      const image = presentationSchema.nodes.image.create({
        src: 'photo.jpg',
        alt: 'A photo',
      })
      const para = presentationSchema.nodes.paragraph.create(null, image)
      const doc = presentationSchema.nodes.doc.create(null, para)
      const plugin = createSegmentPlugin(presentationSchema)
      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      // Apply a transaction to trigger the plugin
      const newState = state.apply(state.tr)

      let paraSegmentId: string | null = null
      newState.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          paraSegmentId = node.attrs.segmentId
        }
      })

      expect(paraSegmentId).not.toBeNull()
      expect(paraSegmentId).toMatch(/^seg-/)
    })

    it('assigns segment ID when empty paragraph gets content', () => {
      // Start with an empty paragraph (no segment ID)
      const emptyPara = presentationSchema.nodes.paragraph.create()
      const doc = presentationSchema.nodes.doc.create(null, emptyPara)
      const plugin = createSegmentPlugin(presentationSchema)
      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      // Verify it has no segment ID initially
      let initialSegmentId: string | null = null
      state.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          initialSegmentId = node.attrs.segmentId
        }
      })
      expect(initialSegmentId).toBeNull()

      // Add content to the paragraph
      const tr = state.tr.insertText('Now has content', 1)
      const newState = state.apply(tr)

      // Now it should have a segment ID
      let newSegmentId: string | null = null
      newState.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          newSegmentId = node.attrs.segmentId
        }
      })

      expect(newSegmentId).not.toBeNull()
      expect(newSegmentId).toMatch(/^seg-/)
    })
  })

  describe('backwards compatibility with sentence nodes', () => {
    it('does not split paragraphs into sentence nodes', () => {
      // With the new architecture, the editor no longer splits paragraphs
      const longText =
        'This is the first sentence with enough content. This is the second sentence that continues. And here is a third sentence to make it longer!'
      const state = createState(longText)

      // The plugin should NOT split this on transactions
      const tr = state.tr.insertText(' ', 1) // Minor edit to trigger
      const newState = state.apply(tr)

      let hasSentenceNode = false
      newState.doc.descendants((node) => {
        if (node.type.name === 'sentence') {
          hasSentenceNode = true
        }
      })

      // Should NOT have sentence nodes - splitting now happens in the viewer
      expect(hasSentenceNode).toBe(false)
    })

    it('preserves existing sentence nodes from old documents', () => {
      // Create a document with existing sentence nodes (backwards compatibility)
      const sentence1 = presentationSchema.nodes.sentence.create(
        { segmentId: 'seg-test-s0' },
        presentationSchema.text('First sentence.'),
      )
      const sentence2 = presentationSchema.nodes.sentence.create(
        { segmentId: 'seg-test-s1' },
        presentationSchema.text('Second sentence.'),
      )
      const para = presentationSchema.nodes.paragraph.create({ segmentId: 'seg-test' }, [sentence1, sentence2])
      const doc = presentationSchema.nodes.doc.create(null, para)
      const plugin = createSegmentPlugin(presentationSchema)

      const state = EditorState.create({
        doc,
        schema: presentationSchema,
        plugins: [plugin],
      })

      // Existing sentence nodes should be preserved
      let sentenceCount = 0
      state.doc.descendants((node) => {
        if (node.type.name === 'sentence') {
          sentenceCount++
        }
      })

      expect(sentenceCount).toBe(2)
    })
  })

  describe('decorations', () => {
    it('creates decorations for segment nodes', () => {
      const para = presentationSchema.nodes.paragraph.create(
        { segmentId: 'seg-001' },
        presentationSchema.text('Decorated paragraph'),
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
      const decorCount1 = pluginState1?.decorations.find(1, state.doc.content.size).length

      // Add another paragraph
      const newPara = presentationSchema.nodes.paragraph.create(
        { segmentId: 'seg-new' },
        presentationSchema.text('New paragraph'),
      )
      const tr = state.tr.insert(state.doc.content.size, newPara)
      const newState = state.apply(tr)

      const pluginState2 = segmentPluginKey.getState(newState)
      const decorCount2 = pluginState2?.decorations.find(1, newState.doc.content.size).length

      // Should have more decorations after adding content
      expect(decorCount2).toBeGreaterThanOrEqual(decorCount1 || 0)
    })
  })
})

describe('getSegments', () => {
  it('returns segments from editor state', () => {
    const para = presentationSchema.nodes.paragraph.create(
      { segmentId: 'seg-001' },
      presentationSchema.text('Test paragraph'),
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
    const para1 = presentationSchema.nodes.paragraph.create({ segmentId: 'seg-001' }, presentationSchema.text('First'))
    const para2 = presentationSchema.nodes.paragraph.create({ segmentId: 'seg-002' }, presentationSchema.text('Second'))
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
