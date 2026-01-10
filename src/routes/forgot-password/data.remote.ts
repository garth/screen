import * as v from 'valibot'
import { form } from '$app/server'
import { encodeBase64url } from '@oslojs/encoding'
import { db } from '$lib/server/db'
import { sendPasswordResetEmail } from '$lib/server/email'

const HOUR_IN_MS = 1000 * 60 * 60

const forgotPasswordSchema = v.object({
  email: v.pipe(v.string(), v.nonEmpty('Email is required'), v.email('Invalid email address')),
})

export const forgotPassword = form(forgotPasswordSchema, async ({ email }) => {
  // Find user by email
  const user = await db.user.findUnique({ where: { email } })

  // Always succeed to prevent email enumeration
  if (!user) {
    return
  }

  // Delete any existing reset token for this email
  await db.passwordReset.deleteMany({ where: { email } })

  // Generate token
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const token = encodeBase64url(tokenBytes)

  // Create password reset record (expires in 1 hour)
  await db.passwordReset.create({
    data: {
      email,
      token,
      expiresAt: new Date(Date.now() + HOUR_IN_MS),
    },
  })

  // Send reset email
  try {
    await sendPasswordResetEmail(email, token)
  } catch (e) {
    console.error('Failed to send password reset email:', e)
  }
})
