import * as v from 'valibot'
import { error, redirect } from '@sveltejs/kit'
import { form } from '$app/server'
import { hash } from '@node-rs/argon2'
import { db } from '$lib/server/db'

const resetPasswordSchema = v.pipe(
  v.object({
    token: v.pipe(v.string(), v.nonEmpty('Token is required')),
    _password: v.pipe(
      v.string(),
      v.minLength(8, 'Password must be at least 8 characters'),
      v.maxLength(255, 'Password is too long'),
    ),
    _confirmPassword: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['_password'], ['_confirmPassword']],
      (input) => input._password === input._confirmPassword,
      'Passwords do not match',
    ),
    ['_confirmPassword'],
  ),
)

export const resetPassword = form(resetPasswordSchema, async ({ token, _password }) => {
  // Find and validate reset record
  const resetRecord = await db.passwordReset.findUnique({
    where: { token },
  })

  if (!resetRecord) {
    error(400, 'Invalid or expired reset link')
  }

  if (resetRecord.expiresAt < new Date()) {
    await db.passwordReset.delete({ where: { id: resetRecord.id } })
    error(400, 'Reset link has expired')
  }

  // Find user
  const user = await db.user.findUnique({ where: { email: resetRecord.email } })
  if (!user) {
    await db.passwordReset.delete({ where: { id: resetRecord.id } })
    error(400, 'User not found')
  }

  // Hash new password
  const passwordHash = await hash(_password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })

  // Update password and delete reset record
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    db.passwordReset.delete({ where: { id: resetRecord.id } }),
  ])

  redirect(303, '/login?reset=true')
})
