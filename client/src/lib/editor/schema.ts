import { Schema, type NodeSpec, type MarkSpec, type Node, type Mark } from 'prosemirror-model'

/**
 * Custom ProseMirror schema for presentations with:
 * - Paragraphs
 * - Headings (h1, h2, h3)
 * - Ordered and unordered lists
 * - Images (stored inline as base64)
 * - Slide dividers (page break for slides)
 * - Blockquotes with attribution
 */

const nodes: Record<string, NodeSpec> = {
  // The root document node
  doc: {
    content: 'block+',
  },

  // Paragraph - contains inline content (sentences are inline nodes)
  paragraph: {
    attrs: {
      segmentId: { default: null },
      mergeGroupId: { default: null },
    },
    content: 'inline*',
    group: 'block',
    parseDOM: [
      {
        tag: 'p',
        getAttrs(dom: HTMLElement) {
          return {
            segmentId: dom.getAttribute('data-segment-id'),
            mergeGroupId: dom.getAttribute('data-merge-group-id'),
          }
        },
      },
    ],
    toDOM(node: Node) {
      const attrs: Record<string, string> = {}
      if (node.attrs.segmentId) {
        attrs['data-segment-id'] = node.attrs.segmentId
      }
      if (node.attrs.mergeGroupId) {
        attrs['data-merge-group-id'] = node.attrs.mergeGroupId
      }
      return ['p', attrs, 0]
    },
  },

  // Sentence - represents a single sentence segment within a split paragraph
  // Inline wrapper that contains text and marks
  sentence: {
    attrs: {
      segmentId: { default: null },
      mergeGroupId: { default: null },
    },
    inline: true,
    content: 'text*',
    group: 'inline',
    parseDOM: [
      {
        tag: 'span[data-sentence]',
        getAttrs(dom: HTMLElement) {
          return {
            segmentId: dom.getAttribute('data-segment-id'),
            mergeGroupId: dom.getAttribute('data-merge-group-id'),
          }
        },
      },
    ],
    toDOM(node: Node) {
      const attrs: Record<string, string> = { 'data-sentence': 'true' }
      if (node.attrs.segmentId) {
        attrs['data-segment-id'] = node.attrs.segmentId
      }
      if (node.attrs.mergeGroupId) {
        attrs['data-merge-group-id'] = node.attrs.mergeGroupId
      }
      return ['span', attrs, 0]
    },
  },

  // Headings (h1, h2, h3)
  heading: {
    attrs: {
      level: { default: 1, validate: 'number' },
      segmentId: { default: null },
      mergeGroupId: { default: null },
    },
    content: 'inline*',
    group: 'block',
    defining: true,
    parseDOM: [
      {
        tag: 'h1',
        getAttrs(dom: HTMLElement) {
          return {
            level: 1,
            segmentId: dom.getAttribute('data-segment-id'),
            mergeGroupId: dom.getAttribute('data-merge-group-id'),
          }
        },
      },
      {
        tag: 'h2',
        getAttrs(dom: HTMLElement) {
          return {
            level: 2,
            segmentId: dom.getAttribute('data-segment-id'),
            mergeGroupId: dom.getAttribute('data-merge-group-id'),
          }
        },
      },
      {
        tag: 'h3',
        getAttrs(dom: HTMLElement) {
          return {
            level: 3,
            segmentId: dom.getAttribute('data-segment-id'),
            mergeGroupId: dom.getAttribute('data-merge-group-id'),
          }
        },
      },
    ],
    toDOM(node: Node) {
      const attrs: Record<string, string> = {}
      if (node.attrs.segmentId) {
        attrs['data-segment-id'] = node.attrs.segmentId
      }
      if (node.attrs.mergeGroupId) {
        attrs['data-merge-group-id'] = node.attrs.mergeGroupId
      }
      return ['h' + node.attrs.level, attrs, 0]
    },
  },

  // Unordered list
  bullet_list: {
    content: 'list_item+',
    group: 'block',
    parseDOM: [{ tag: 'ul' }],
    toDOM() {
      return ['ul', 0]
    },
  },

  // Ordered list
  ordered_list: {
    attrs: { order: { default: 1, validate: 'number' } },
    content: 'list_item+',
    group: 'block',
    parseDOM: [
      {
        tag: 'ol',
        getAttrs(dom: HTMLElement) {
          return { order: dom.hasAttribute('start') ? +dom.getAttribute('start')! : 1 }
        },
      },
    ],
    toDOM(node: Node) {
      return node.attrs.order === 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0]
    },
  },

  // List item
  list_item: {
    attrs: {
      segmentId: { default: null },
      mergeGroupId: { default: null },
    },
    content: 'paragraph block*',
    parseDOM: [
      {
        tag: 'li',
        getAttrs(dom: HTMLElement) {
          return {
            segmentId: dom.getAttribute('data-segment-id'),
            mergeGroupId: dom.getAttribute('data-merge-group-id'),
          }
        },
      },
    ],
    toDOM(node: Node) {
      const attrs: Record<string, string> = {}
      if (node.attrs.segmentId) {
        attrs['data-segment-id'] = node.attrs.segmentId
      }
      if (node.attrs.mergeGroupId) {
        attrs['data-merge-group-id'] = node.attrs.mergeGroupId
      }
      return ['li', attrs, 0]
    },
    defining: true,
  },

  // Image (stored inline as base64 data URL)
  image: {
    inline: true,
    attrs: {
      src: { validate: 'string' },
      alt: { default: null, validate: 'string|null' },
      title: { default: null, validate: 'string|null' },
      segmentId: { default: null },
      mergeGroupId: { default: null },
    },
    group: 'inline',
    draggable: true,
    parseDOM: [
      {
        tag: 'img[src]',
        getAttrs(dom: HTMLElement) {
          return {
            src: dom.getAttribute('src'),
            alt: dom.getAttribute('alt'),
            title: dom.getAttribute('title'),
            segmentId: dom.getAttribute('data-segment-id'),
            mergeGroupId: dom.getAttribute('data-merge-group-id'),
          }
        },
      },
    ],
    toDOM(node: Node) {
      const { src, alt, title, segmentId, mergeGroupId } = node.attrs
      const attrs: Record<string, string | null> = { src, alt, title }
      if (segmentId) {
        attrs['data-segment-id'] = segmentId
      }
      if (mergeGroupId) {
        attrs['data-merge-group-id'] = mergeGroupId
      }
      return ['img', attrs]
    },
  },

  // Slide divider (forces a new slide in presentation mode)
  slide_divider: {
    group: 'block',
    parseDOM: [{ tag: 'hr.slide-divider' }, { tag: 'hr[data-slide-divider]' }],
    toDOM() {
      return ['hr', { class: 'slide-divider', 'data-slide-divider': 'true' }]
    },
  },

  // Blockquote with optional attribution
  blockquote: {
    attrs: {
      segmentId: { default: null },
      mergeGroupId: { default: null },
    },
    content: 'block+ attribution?',
    group: 'block',
    defining: true,
    parseDOM: [
      {
        tag: 'blockquote',
        getAttrs(dom: HTMLElement) {
          return {
            segmentId: dom.getAttribute('data-segment-id'),
            mergeGroupId: dom.getAttribute('data-merge-group-id'),
          }
        },
      },
    ],
    toDOM(node: Node) {
      const attrs: Record<string, string> = {}
      if (node.attrs.segmentId) {
        attrs['data-segment-id'] = node.attrs.segmentId
      }
      if (node.attrs.mergeGroupId) {
        attrs['data-merge-group-id'] = node.attrs.mergeGroupId
      }
      return ['blockquote', attrs, 0]
    },
  },

  // Attribution line for blockquotes
  attribution: {
    content: 'inline*',
    parseDOM: [{ tag: 'cite' }, { tag: 'figcaption' }],
    toDOM() {
      return ['cite', 0]
    },
  },

  // Plain text node
  text: {
    group: 'inline',
  },

  // Hard break
  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM() {
      return ['br']
    },
  },
}

const marks: Record<string, MarkSpec> = {
  // Bold/strong
  strong: {
    parseDOM: [
      { tag: 'strong' },
      { tag: 'b', getAttrs: (node: HTMLElement) => node.style.fontWeight !== 'normal' && null },
      {
        style: 'font-weight',
        getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
      },
    ],
    toDOM() {
      return ['strong', 0]
    },
  },

  // Italic/emphasis
  em: {
    parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
    toDOM() {
      return ['em', 0]
    },
  },

  // Underline
  underline: {
    parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
    toDOM() {
      return ['u', 0]
    },
  },

  // Strikethrough
  strikethrough: {
    parseDOM: [{ tag: 's' }, { tag: 'strike' }, { style: 'text-decoration=line-through' }],
    toDOM() {
      return ['s', 0]
    },
  },

  // Code (inline)
  code: {
    parseDOM: [{ tag: 'code' }],
    toDOM() {
      return ['code', 0]
    },
  },

  // Link
  link: {
    attrs: {
      href: { validate: 'string' },
      title: { default: null, validate: 'string|null' },
    },
    inclusive: false,
    parseDOM: [
      {
        tag: 'a[href]',
        getAttrs(dom: HTMLElement) {
          return { href: dom.getAttribute('href'), title: dom.getAttribute('title') }
        },
      },
    ],
    toDOM(node: Mark) {
      const { href, title } = node.attrs
      return ['a', { href, title }, 0]
    },
  },
}

export const presentationSchema = new Schema({ nodes, marks })

export default presentationSchema
