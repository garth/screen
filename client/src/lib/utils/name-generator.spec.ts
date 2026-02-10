import { describe, expect, it } from 'vitest'
import { generatePresentationName } from './name-generator'

describe('generatePresentationName', () => {
  it('returns a string', () => {
    const name = generatePresentationName()
    expect(typeof name).toBe('string')
  })

  it('returns a name with two words', () => {
    const name = generatePresentationName()
    const words = name.split(' ')
    expect(words).toHaveLength(2)
  })

  it('returns a name with capitalized words', () => {
    const name = generatePresentationName()
    const words = name.split(' ')
    for (const word of words) {
      expect(word[0]).toBe(word[0].toUpperCase())
    }
  })

  it('returns non-empty words', () => {
    const name = generatePresentationName()
    const words = name.split(' ')
    for (const word of words) {
      expect(word.length).toBeGreaterThan(0)
    }
  })

  it('generates different names (not always the same)', () => {
    const names = new Set<string>()
    // Generate 50 names - with 20x20=400 combinations, we should get variety
    for (let i = 0; i < 50; i++) {
      names.add(generatePresentationName())
    }
    // Should have at least a few unique names
    expect(names.size).toBeGreaterThan(5)
  })

  it('uses church/Christian themed words', () => {
    // Generate many names and check they contain expected words
    const allNames: string[] = []
    for (let i = 0; i < 100; i++) {
      allNames.push(generatePresentationName())
    }

    const allText = allNames.join(' ')

    // Check for some expected adjectives
    const expectedAdjectives = ['Blessed', 'Faithful', 'Graceful', 'Peaceful', 'Radiant']
    const foundAdjectives = expectedAdjectives.filter((adj) => allText.includes(adj))
    expect(foundAdjectives.length).toBeGreaterThan(0)

    // Check for some expected nouns
    const expectedNouns = ['Path', 'Light', 'Promise', 'Grace', 'Hope']
    const foundNouns = expectedNouns.filter((noun) => allText.includes(noun))
    expect(foundNouns.length).toBeGreaterThan(0)
  })
})
