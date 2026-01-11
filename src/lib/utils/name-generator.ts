/**
 * Generates creative church/Christian themed names for new presentations.
 */

const adjectives = [
  'Blessed',
  'Faithful',
  'Graceful',
  'Joyful',
  'Peaceful',
  'Radiant',
  'Redeemed',
  'Renewed',
  'Restored',
  'Sacred',
  'Hopeful',
  'Eternal',
  'Divine',
  'Holy',
  'Abundant',
  'Glorious',
  'Merciful',
  'Righteous',
  'Humble',
  'Victorious',
]

const nouns = [
  'Path',
  'Light',
  'Promise',
  'Journey',
  'Grace',
  'Blessing',
  'Hope',
  'Faith',
  'Joy',
  'Peace',
  'Praise',
  'Worship',
  'Prayer',
  'Spirit',
  'Truth',
  'Word',
  'Message',
  'Calling',
  'Testimony',
  'Vision',
]

/**
 * Generates a random presentation name in the format "Adjective Noun"
 * e.g., "Blessed Journey", "Faithful Promise", "Radiant Hope"
 */
export function generatePresentationName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj} ${noun}`
}
