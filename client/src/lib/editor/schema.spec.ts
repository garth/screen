import { describe, it, expect } from 'vitest'
import { presentationSchema } from './schema'

describe('presentationSchema', () => {
  describe('nodes', () => {
    it('has all required node types', () => {
      expect(presentationSchema.nodes.doc).toBeDefined()
      expect(presentationSchema.nodes.paragraph).toBeDefined()
      expect(presentationSchema.nodes.heading).toBeDefined()
      expect(presentationSchema.nodes.bullet_list).toBeDefined()
      expect(presentationSchema.nodes.ordered_list).toBeDefined()
      expect(presentationSchema.nodes.list_item).toBeDefined()
      expect(presentationSchema.nodes.image).toBeDefined()
      expect(presentationSchema.nodes.slide_divider).toBeDefined()
      expect(presentationSchema.nodes.blockquote).toBeDefined()
      expect(presentationSchema.nodes.attribution).toBeDefined()
      expect(presentationSchema.nodes.text).toBeDefined()
      expect(presentationSchema.nodes.hard_break).toBeDefined()
    })

    describe('paragraph', () => {
      it('is in the block group', () => {
        expect(presentationSchema.nodes.paragraph.spec.group).toBe('block')
      })

      it('can contain inline content', () => {
        expect(presentationSchema.nodes.paragraph.spec.content).toBe('inline*')
      })

      it('creates valid paragraph node', () => {
        const paragraph = presentationSchema.nodes.paragraph.create()
        expect(paragraph.type.name).toBe('paragraph')
      })

      it('serializes to DOM as p element', () => {
        const paragraph = presentationSchema.nodes.paragraph.create()
        const dom = presentationSchema.nodes.paragraph.spec.toDOM?.(paragraph)
        expect(dom).toEqual(['p', {}, 0])
      })
    })

    describe('heading', () => {
      it('is in the block group', () => {
        expect(presentationSchema.nodes.heading.spec.group).toBe('block')
      })

      it('has level attribute defaulting to 1', () => {
        const heading = presentationSchema.nodes.heading.create()
        expect(heading.attrs.level).toBe(1)
      })

      it('accepts level 1, 2, or 3', () => {
        const h1 = presentationSchema.nodes.heading.create({ level: 1 })
        const h2 = presentationSchema.nodes.heading.create({ level: 2 })
        const h3 = presentationSchema.nodes.heading.create({ level: 3 })

        expect(h1.attrs.level).toBe(1)
        expect(h2.attrs.level).toBe(2)
        expect(h3.attrs.level).toBe(3)
      })

      it('serializes to DOM with correct heading tag', () => {
        const h1 = presentationSchema.nodes.heading.create({ level: 1 })
        const h2 = presentationSchema.nodes.heading.create({ level: 2 })
        const h3 = presentationSchema.nodes.heading.create({ level: 3 })

        expect(presentationSchema.nodes.heading.spec.toDOM?.(h1)).toEqual(['h1', {}, 0])
        expect(presentationSchema.nodes.heading.spec.toDOM?.(h2)).toEqual(['h2', {}, 0])
        expect(presentationSchema.nodes.heading.spec.toDOM?.(h3)).toEqual(['h3', {}, 0])
      })
    })

    describe('bullet_list', () => {
      it('is in the block group', () => {
        expect(presentationSchema.nodes.bullet_list.spec.group).toBe('block')
      })

      it('contains list_item nodes', () => {
        expect(presentationSchema.nodes.bullet_list.spec.content).toBe('list_item+')
      })

      it('serializes to DOM as ul element', () => {
        const list = presentationSchema.nodes.bullet_list.create()
        expect(presentationSchema.nodes.bullet_list.spec.toDOM?.(list)).toEqual(['ul', 0])
      })
    })

    describe('ordered_list', () => {
      it('is in the block group', () => {
        expect(presentationSchema.nodes.ordered_list.spec.group).toBe('block')
      })

      it('has order attribute defaulting to 1', () => {
        const list = presentationSchema.nodes.ordered_list.create()
        expect(list.attrs.order).toBe(1)
      })

      it('accepts custom start order', () => {
        const list = presentationSchema.nodes.ordered_list.create({ order: 5 })
        expect(list.attrs.order).toBe(5)
      })

      it('serializes to DOM as ol element', () => {
        const list = presentationSchema.nodes.ordered_list.create({ order: 1 })
        expect(presentationSchema.nodes.ordered_list.spec.toDOM?.(list)).toEqual(['ol', 0])
      })

      it('includes start attribute when order is not 1', () => {
        const list = presentationSchema.nodes.ordered_list.create({ order: 3 })
        expect(presentationSchema.nodes.ordered_list.spec.toDOM?.(list)).toEqual(['ol', { start: 3 }, 0])
      })
    })

    describe('list_item', () => {
      it('can contain paragraph and block content', () => {
        expect(presentationSchema.nodes.list_item.spec.content).toBe('paragraph block*')
      })

      it('serializes to DOM as li element', () => {
        const item = presentationSchema.nodes.list_item.create()
        expect(presentationSchema.nodes.list_item.spec.toDOM?.(item)).toEqual(['li', {}, 0])
      })
    })

    describe('image', () => {
      it('is inline', () => {
        expect(presentationSchema.nodes.image.spec.inline).toBe(true)
      })

      it('is in the inline group', () => {
        expect(presentationSchema.nodes.image.spec.group).toBe('inline')
      })

      it('is draggable', () => {
        expect(presentationSchema.nodes.image.spec.draggable).toBe(true)
      })

      it('has required src attribute', () => {
        const image = presentationSchema.nodes.image.create({ src: 'test.jpg' })
        expect(image.attrs.src).toBe('test.jpg')
      })

      it('has optional alt and title attributes', () => {
        const image = presentationSchema.nodes.image.create({
          src: 'test.jpg',
          alt: 'Test image',
          title: 'Image title',
        })
        expect(image.attrs.alt).toBe('Test image')
        expect(image.attrs.title).toBe('Image title')
      })

      it('serializes to DOM as img element', () => {
        const image = presentationSchema.nodes.image.create({
          src: 'test.jpg',
          alt: 'Test',
          title: 'Title',
        })
        expect(presentationSchema.nodes.image.spec.toDOM?.(image)).toEqual([
          'img',
          { src: 'test.jpg', alt: 'Test', title: 'Title' },
        ])
      })
    })

    describe('slide_divider', () => {
      it('is in the block group', () => {
        expect(presentationSchema.nodes.slide_divider.spec.group).toBe('block')
      })

      it('creates valid slide divider node', () => {
        const divider = presentationSchema.nodes.slide_divider.create()
        expect(divider.type.name).toBe('slide_divider')
      })

      it('serializes to DOM as hr element with slide-divider class', () => {
        const divider = presentationSchema.nodes.slide_divider.create()
        expect(presentationSchema.nodes.slide_divider.spec.toDOM?.(divider)).toEqual([
          'hr',
          { class: 'slide-divider', 'data-slide-divider': 'true' },
        ])
      })
    })

    describe('blockquote', () => {
      it('is in the block group', () => {
        expect(presentationSchema.nodes.blockquote.spec.group).toBe('block')
      })

      it('can contain block content and optional attribution', () => {
        expect(presentationSchema.nodes.blockquote.spec.content).toBe('block+ attribution?')
      })

      it('serializes to DOM as blockquote element', () => {
        const quote = presentationSchema.nodes.blockquote.create()
        expect(presentationSchema.nodes.blockquote.spec.toDOM?.(quote)).toEqual(['blockquote', {}, 0])
      })
    })

    describe('attribution', () => {
      it('can contain inline content', () => {
        expect(presentationSchema.nodes.attribution.spec.content).toBe('inline*')
      })

      it('serializes to DOM as cite element', () => {
        const attr = presentationSchema.nodes.attribution.create()
        expect(presentationSchema.nodes.attribution.spec.toDOM?.(attr)).toEqual(['cite', 0])
      })
    })

    describe('hard_break', () => {
      it('is inline', () => {
        expect(presentationSchema.nodes.hard_break.spec.inline).toBe(true)
      })

      it('is in the inline group', () => {
        expect(presentationSchema.nodes.hard_break.spec.group).toBe('inline')
      })

      it('is not selectable', () => {
        expect(presentationSchema.nodes.hard_break.spec.selectable).toBe(false)
      })

      it('serializes to DOM as br element', () => {
        const br = presentationSchema.nodes.hard_break.create()
        expect(presentationSchema.nodes.hard_break.spec.toDOM?.(br)).toEqual(['br'])
      })
    })

    describe('sentence', () => {
      it('is inline', () => {
        expect(presentationSchema.nodes.sentence.spec.inline).toBe(true)
      })

      it('is in the inline group', () => {
        expect(presentationSchema.nodes.sentence.spec.group).toBe('inline')
      })

      it('can contain text', () => {
        expect(presentationSchema.nodes.sentence.spec.content).toBe('text*')
      })

      it('has segmentId attribute', () => {
        const sentence = presentationSchema.nodes.sentence.create({ segmentId: 'seg-test' })
        expect(sentence.attrs.segmentId).toBe('seg-test')
      })

      it('has null segmentId by default', () => {
        const sentence = presentationSchema.nodes.sentence.create()
        expect(sentence.attrs.segmentId).toBeNull()
      })

      it('serializes to DOM as span with data-sentence attribute', () => {
        const sentence = presentationSchema.nodes.sentence.create()
        const dom = presentationSchema.nodes.sentence.spec.toDOM?.(sentence)
        expect(dom).toEqual(['span', { 'data-sentence': 'true' }, 0])
      })

      it('includes data-segment-id in DOM when segmentId is set', () => {
        const sentence = presentationSchema.nodes.sentence.create({ segmentId: 'seg-abc123' })
        const dom = presentationSchema.nodes.sentence.spec.toDOM?.(sentence)
        expect(dom).toEqual(['span', { 'data-sentence': 'true', 'data-segment-id': 'seg-abc123' }, 0])
      })
    })

    describe('segmentId attributes', () => {
      it('paragraph has segmentId attribute', () => {
        const para = presentationSchema.nodes.paragraph.create({ segmentId: 'seg-p1' })
        expect(para.attrs.segmentId).toBe('seg-p1')
      })

      it('heading has segmentId attribute', () => {
        const heading = presentationSchema.nodes.heading.create({
          level: 1,
          segmentId: 'seg-h1',
        })
        expect(heading.attrs.segmentId).toBe('seg-h1')
      })

      it('list_item has segmentId attribute', () => {
        const para = presentationSchema.nodes.paragraph.create()
        const li = presentationSchema.nodes.list_item.create({ segmentId: 'seg-li1' }, para)
        expect(li.attrs.segmentId).toBe('seg-li1')
      })

      it('image has segmentId attribute', () => {
        const img = presentationSchema.nodes.image.create({
          src: 'test.png',
          segmentId: 'seg-img1',
        })
        expect(img.attrs.segmentId).toBe('seg-img1')
      })

      it('blockquote has segmentId attribute', () => {
        const para = presentationSchema.nodes.paragraph.create()
        const bq = presentationSchema.nodes.blockquote.create({ segmentId: 'seg-bq1' }, para)
        expect(bq.attrs.segmentId).toBe('seg-bq1')
      })

      it('paragraph includes data-segment-id in DOM when set', () => {
        const para = presentationSchema.nodes.paragraph.create({ segmentId: 'seg-para' })
        const dom = presentationSchema.nodes.paragraph.spec.toDOM?.(para)
        expect(dom).toEqual(['p', { 'data-segment-id': 'seg-para' }, 0])
      })

      it('heading includes data-segment-id in DOM when set', () => {
        const heading = presentationSchema.nodes.heading.create({
          level: 2,
          segmentId: 'seg-heading',
        })
        const dom = presentationSchema.nodes.heading.spec.toDOM?.(heading)
        expect(dom).toEqual(['h2', { 'data-segment-id': 'seg-heading' }, 0])
      })
    })
  })

  describe('marks', () => {
    it('has all required mark types', () => {
      expect(presentationSchema.marks.strong).toBeDefined()
      expect(presentationSchema.marks.em).toBeDefined()
      expect(presentationSchema.marks.underline).toBeDefined()
      expect(presentationSchema.marks.strikethrough).toBeDefined()
      expect(presentationSchema.marks.code).toBeDefined()
      expect(presentationSchema.marks.link).toBeDefined()
    })

    describe('strong', () => {
      it('creates valid strong mark', () => {
        const mark = presentationSchema.marks.strong.create()
        expect(mark.type.name).toBe('strong')
      })

      it('serializes to DOM as strong element', () => {
        const mark = presentationSchema.marks.strong.create()
        expect(presentationSchema.marks.strong.spec.toDOM?.(mark, true)).toEqual(['strong', 0])
      })
    })

    describe('em', () => {
      it('creates valid em mark', () => {
        const mark = presentationSchema.marks.em.create()
        expect(mark.type.name).toBe('em')
      })

      it('serializes to DOM as em element', () => {
        const mark = presentationSchema.marks.em.create()
        expect(presentationSchema.marks.em.spec.toDOM?.(mark, true)).toEqual(['em', 0])
      })
    })

    describe('underline', () => {
      it('creates valid underline mark', () => {
        const mark = presentationSchema.marks.underline.create()
        expect(mark.type.name).toBe('underline')
      })

      it('serializes to DOM as u element', () => {
        const mark = presentationSchema.marks.underline.create()
        expect(presentationSchema.marks.underline.spec.toDOM?.(mark, true)).toEqual(['u', 0])
      })
    })

    describe('strikethrough', () => {
      it('creates valid strikethrough mark', () => {
        const mark = presentationSchema.marks.strikethrough.create()
        expect(mark.type.name).toBe('strikethrough')
      })

      it('serializes to DOM as s element', () => {
        const mark = presentationSchema.marks.strikethrough.create()
        expect(presentationSchema.marks.strikethrough.spec.toDOM?.(mark, true)).toEqual(['s', 0])
      })
    })

    describe('code', () => {
      it('creates valid code mark', () => {
        const mark = presentationSchema.marks.code.create()
        expect(mark.type.name).toBe('code')
      })

      it('serializes to DOM as code element', () => {
        const mark = presentationSchema.marks.code.create()
        expect(presentationSchema.marks.code.spec.toDOM?.(mark, true)).toEqual(['code', 0])
      })
    })

    describe('link', () => {
      it('creates valid link mark with href', () => {
        const mark = presentationSchema.marks.link.create({ href: 'https://example.com' })
        expect(mark.type.name).toBe('link')
        expect(mark.attrs.href).toBe('https://example.com')
      })

      it('has optional title attribute', () => {
        const mark = presentationSchema.marks.link.create({
          href: 'https://example.com',
          title: 'Example',
        })
        expect(mark.attrs.title).toBe('Example')
      })

      it('is not inclusive', () => {
        expect(presentationSchema.marks.link.spec.inclusive).toBe(false)
      })

      it('serializes to DOM as a element', () => {
        const mark = presentationSchema.marks.link.create({
          href: 'https://example.com',
          title: 'Example',
        })
        expect(presentationSchema.marks.link.spec.toDOM?.(mark, true)).toEqual([
          'a',
          { href: 'https://example.com', title: 'Example' },
          0,
        ])
      })
    })
  })

  describe('document structure', () => {
    it('doc node can contain block content', () => {
      expect(presentationSchema.nodes.doc.spec.content).toBe('block+')
    })

    it('creates valid document with paragraph', () => {
      const paragraph = presentationSchema.nodes.paragraph.create(null, presentationSchema.text('Hello world'))
      const doc = presentationSchema.nodes.doc.create(null, paragraph)
      expect(doc.type.name).toBe('doc')
      expect(doc.childCount).toBe(1)
      expect(doc.firstChild?.type.name).toBe('paragraph')
    })

    it('creates valid document with heading', () => {
      const heading = presentationSchema.nodes.heading.create({ level: 1 }, presentationSchema.text('Title'))
      const doc = presentationSchema.nodes.doc.create(null, heading)
      expect(doc.firstChild?.type.name).toBe('heading')
      expect(doc.firstChild?.attrs.level).toBe(1)
    })

    it('creates valid document with bullet list', () => {
      const item = presentationSchema.nodes.list_item.create(
        null,
        presentationSchema.nodes.paragraph.create(null, presentationSchema.text('Item')),
      )
      const list = presentationSchema.nodes.bullet_list.create(null, item)
      const doc = presentationSchema.nodes.doc.create(null, list)
      expect(doc.firstChild?.type.name).toBe('bullet_list')
    })

    it('creates valid document with multiple block elements', () => {
      const heading = presentationSchema.nodes.heading.create({ level: 1 }, presentationSchema.text('Title'))
      const paragraph = presentationSchema.nodes.paragraph.create(null, presentationSchema.text('Content'))
      const divider = presentationSchema.nodes.slide_divider.create()
      const doc = presentationSchema.nodes.doc.create(null, [heading, paragraph, divider])

      expect(doc.childCount).toBe(3)
      expect(doc.child(0).type.name).toBe('heading')
      expect(doc.child(1).type.name).toBe('paragraph')
      expect(doc.child(2).type.name).toBe('slide_divider')
    })
  })
})
