import { describe, expect, it } from 'vitest'
import { gravatarUrl } from './gravatar'

describe('gravatarUrl', () => {
  describe('basic functionality', () => {
    it('generates a valid gravatar URL', () => {
      const url = gravatarUrl('test@example.com')
      expect(url).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?s=80&d=identicon$/)
    })

    it('generates consistent hash for same email', () => {
      const url1 = gravatarUrl('test@example.com')
      const url2 = gravatarUrl('test@example.com')
      expect(url1).toBe(url2)
    })

    it('generates different hash for different emails', () => {
      const url1 = gravatarUrl('test1@example.com')
      const url2 = gravatarUrl('test2@example.com')
      expect(url1).not.toBe(url2)
    })
  })

  describe('email normalization', () => {
    it('converts email to lowercase', () => {
      const lower = gravatarUrl('test@example.com')
      const upper = gravatarUrl('TEST@EXAMPLE.COM')
      const mixed = gravatarUrl('TeSt@ExAmPlE.cOm')
      expect(lower).toBe(upper)
      expect(lower).toBe(mixed)
    })

    it('trims whitespace from email', () => {
      const clean = gravatarUrl('test@example.com')
      const leadingSpace = gravatarUrl('  test@example.com')
      const trailingSpace = gravatarUrl('test@example.com  ')
      const bothSpaces = gravatarUrl('  test@example.com  ')
      expect(clean).toBe(leadingSpace)
      expect(clean).toBe(trailingSpace)
      expect(clean).toBe(bothSpaces)
    })

    it('handles both case and whitespace normalization', () => {
      const clean = gravatarUrl('test@example.com')
      const messy = gravatarUrl('  TEST@EXAMPLE.COM  ')
      expect(clean).toBe(messy)
    })
  })

  describe('size parameter', () => {
    it('defaults to size 80', () => {
      const url = gravatarUrl('test@example.com')
      expect(url).toContain('s=80')
    })

    it('accepts custom size', () => {
      const url = gravatarUrl('test@example.com', 200)
      expect(url).toContain('s=200')
    })

    it('accepts small size', () => {
      const url = gravatarUrl('test@example.com', 16)
      expect(url).toContain('s=16')
    })

    it('accepts large size', () => {
      const url = gravatarUrl('test@example.com', 512)
      expect(url).toContain('s=512')
    })
  })

  describe('URL format', () => {
    it('uses HTTPS', () => {
      const url = gravatarUrl('test@example.com')
      expect(url).toMatch(/^https:\/\//)
    })

    it('uses gravatar.com domain', () => {
      const url = gravatarUrl('test@example.com')
      expect(url).toContain('www.gravatar.com')
    })

    it('includes identicon fallback', () => {
      const url = gravatarUrl('test@example.com')
      expect(url).toContain('d=identicon')
    })

    it('generates correct MD5 hash for known email', () => {
      // MD5 of "test@example.com" is "55502f40dc8b7c769880b10874abc9d0"
      const url = gravatarUrl('test@example.com')
      expect(url).toContain('55502f40dc8b7c769880b10874abc9d0')
    })
  })
})
