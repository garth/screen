import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { hash } from '@node-rs/argon2'
import { db } from '$lib/server/db'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

// Only available in development/test environment
export const POST: RequestHandler = async ({ request }) => {
  const isTestEnv = dev || env.ALLOW_TEST_ENDPOINTS === 'true'
  if (!isTestEnv) {
    error(404, 'Not found')
  }

  const { name, firstName, lastName, email, password } = await request.json()

  // Support both old 'name' field (split into first/last) and new firstName/lastName fields
  let first = firstName
  let last = lastName
  if (!first && !last && name) {
    const parts = name.split(' ')
    first = parts[0] || ''
    last = parts.slice(1).join(' ') || ''
  }

  if (!first || !last || !email || !password) {
    error(400, 'Missing required fields')
  }

  // Hash password
  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })

  // Create pending verification (simulates unverified registration)
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const verification = await db.emailVerification.create({
    data: {
      firstName: first,
      lastName: last,
      email,
      passwordHash,
      token,
      expiresAt,
    },
  })

  return json({ id: verification.id, email, verificationToken: token })
}
