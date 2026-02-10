import type { PageServerLoad } from './$types'
import { db } from '$lib/server/db'

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token')

  if (!token) {
    return { error: 'Missing reset token', token: null }
  }

  // Find reset record
  const resetRecord = await db.passwordReset.findUnique({
    where: { token },
  })

  if (!resetRecord) {
    return { error: 'Invalid or expired reset link', token: null }
  }

  // Check if expired
  if (resetRecord.expiresAt < new Date()) {
    // Clean up expired token
    await db.passwordReset.delete({ where: { id: resetRecord.id } })
    return { error: 'Reset link has expired. Please request a new one.', token: null }
  }

  return { error: null, token }
}
