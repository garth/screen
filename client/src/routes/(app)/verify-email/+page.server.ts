import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/db'

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token')

  if (!token) {
    return { error: 'Missing verification token' }
  }

  // Find verification record
  const verification = await db.emailVerification.findUnique({
    where: { token },
  })

  if (!verification) {
    return { error: 'Invalid or expired verification link' }
  }

  // Check if expired
  if (verification.expiresAt < new Date()) {
    // Clean up expired token
    await db.emailVerification.delete({ where: { id: verification.id } })
    return { error: 'Verification link has expired. Please register again.' }
  }

  // Check if email is already taken (race condition protection)
  const existingUser = await db.user.findUnique({ where: { email: verification.email } })
  if (existingUser) {
    await db.emailVerification.delete({ where: { id: verification.id } })
    return { error: 'Email already registered. Please log in.' }
  }

  // Create user from verification data and delete verification record
  await db.$transaction([
    db.user.create({
      data: {
        firstName: verification.firstName,
        lastName: verification.lastName,
        email: verification.email,
        passwordHash: verification.passwordHash,
      },
    }),
    db.emailVerification.delete({ where: { id: verification.id } }),
  ])

  // Redirect to login with success message
  redirect(303, '/login?verified=true')
}
