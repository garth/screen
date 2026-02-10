import { createHash } from 'crypto'

export function gravatarUrl(email: string, size = 80): string {
  const hash = createHash('md5').update(email.toLowerCase().trim()).digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`
}

/**
 * Add gravatarUrl to a user object based on their email
 */
export function addGravatar<T extends { email: string }>(user: T): T & { gravatarUrl: string } {
  return { ...user, gravatarUrl: gravatarUrl(user.email) }
}
