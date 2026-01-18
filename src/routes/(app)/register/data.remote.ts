import * as v from 'valibot'
import { invalid } from '@sveltejs/kit'
import { form } from '$app/server'
import { hash } from '@node-rs/argon2'
import { encodeBase64url } from '@oslojs/encoding'
import { db } from '$lib/server/db'
import { sendVerificationEmail } from '$lib/server/email'

const DAY_IN_MS = 1000 * 60 * 60 * 24

const registerSchema = v.object({
  firstName: v.pipe(v.string(), v.nonEmpty('First name is required')),
  lastName: v.pipe(v.string(), v.nonEmpty('Last name is required')),
  email: v.pipe(v.string(), v.nonEmpty('Email is required'), v.email('Invalid email address')),
  _password: v.pipe(
    v.string(),
    v.minLength(6, 'Password must be at least 6 characters'),
    v.maxLength(255, 'Password is too long'),
  ),
})

export const register = form(registerSchema, async ({ firstName, lastName, email, _password }, issue) => {
  // Check if email already exists as a verified user
  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    invalid(issue.email('Email already registered'))
  }

  // Check if there's a pending verification for this email
  const existingVerification = await db.emailVerification.findUnique({ where: { email } })
  if (existingVerification) {
    if (existingVerification.expiresAt > new Date()) {
      // Verification still valid - reject (they should check their email)
      invalid(issue.email('Email already registered'))
    }
    // Verification expired - delete it and allow re-registration
    await db.emailVerification.delete({ where: { id: existingVerification.id } })
  }

  // Hash password with Argon2
  const passwordHash = await hash(_password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })

  // Generate verification token
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const token = encodeBase64url(tokenBytes)

  // Create pending verification record (expires in 24 hours)
  await db.emailVerification.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      token,
      expiresAt: new Date(Date.now() + DAY_IN_MS),
    },
  })

  // Send verification email (don't let failures block registration)
  try {
    await sendVerificationEmail(email, token)
  } catch (e) {
    console.error('Failed to send verification email:', e)
  }
})
