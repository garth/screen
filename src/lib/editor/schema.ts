import { Schema, NodeSpec, MarkSpec } from 'prosemirror-model'

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

  // Paragraph
  paragraph: {
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p' }],
    toDOM() {
      return ['p', 0]
    },
  },

  // Headings (h1, h2, h3)
  heading: {
    attrs: { level: { default: 1, validate: 'number' } },
    content: 'inline*',
    group: 'block',
    defining: true,
    parseDOM: [
      { tag: 'h1', attrs: { level: 1 } },
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
    ],
    toDOM(node) {
      return ['h' + node.attrs.level, 0]
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
        getAttrs(dom) {
          const element = dom as HTMLElement
          return { order: element.hasAttribute('start') ? +element.getAttribute('start')! : 1 }
        },
      },
    ],
    toDOM(node) {
      return node.attrs.order === 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0]
    },
  },

  // List item
  list_item: {
    content: 'paragraph block*',
    parseDOM: [{ tag: 'li' }],
    toDOM() {
      return ['li', 0]
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
    },
    group: 'inline',
    draggable: true,
    parseDOM: [
      {
        tag: 'img[src]',
        getAttrs(dom) {
          const element = dom as HTMLImageElement
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
          }
        },
      },
    ],
    toDOM(node) {
      const { src, alt, title } = node.attrs
      return ['img', { src, alt, title }]
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
    content: 'block+ attribution?',
    group: 'block',
    defining: true,
    parseDOM: [{ tag: 'blockquote' }],
    toDOM() {
      return ['blockquote', 0]
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
      { tag: 'b', getAttrs: (node) => (node as HTMLElement).style.fontWeight !== 'normal' && null },
      {
        style: 'font-weight',
        getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
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
        getAttrs(dom) {
          const element = dom as HTMLAnchorElement
          return { href: element.getAttribute('href'), title: element.getAttribute('title') }
        },
      },
    ],
    toDOM(node) {
      const { href, title } = node.attrs
      return ['a', { href, title }, 0]
    },
  },
}

export const presentationSchema = new Schema({ nodes, marks })

export default presentationSchema
