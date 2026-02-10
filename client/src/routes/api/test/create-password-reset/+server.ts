import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

// Only available in development/test environment
export const POST: RequestHandler = async ({ request }) => {
  const isTestEnv = dev || env.ALLOW_TEST_ENDPOINTS === 'true'
  if (!isTestEnv) {
    error(404, 'Not found')
  }

  const { email } = await request.json()

  if (!email) {
    error(400, 'Missing email')
  }

  // Verify user exists
  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    error(400, 'User not found')
  }

  // Delete any existing reset token
  await db.passwordReset.deleteMany({ where: { email } })

  // Create password reset token
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordReset.create({
    data: {
      email,
      token,
      expiresAt,
    },
  })

  return json({ email, resetToken: token })
}
