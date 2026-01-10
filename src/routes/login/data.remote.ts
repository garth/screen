import * as v from 'valibot'
import { invalid, redirect } from '@sveltejs/kit'
import { form, getRequestEvent } from '$app/server'
import { verify } from '@node-rs/argon2'
import { db } from '$lib/server/db'
import * as auth from '$lib/server/auth'

const loginSchema = v.object({
  email: v.pipe(v.string(), v.nonEmpty('Email is required'), v.email('Invalid email address')),
  _password: v.pipe(v.string(), v.nonEmpty('Password is required')),
  redirectTo: v.optional(v.string()),
})

export const login = form(loginSchema, async ({ email, _password, redirectTo }, issue) => {
  // Find user by email
  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    invalid(issue.email('Invalid email or password'))
  }

  // Verify password
  const validPassword = await verify(user!.passwordHash, _password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })
  if (!validPassword) {
    invalid(issue.email('Invalid email or password'))
  }

  // Create session
  const sessionToken = auth.generateSessionToken()
  const session = await auth.createSession(sessionToken, user!.id)

  // Set session cookie
  const event = getRequestEvent()
  auth.setSessionTokenCookie(event, sessionToken, session.expiresAt)

  // Redirect to specified URL or default to home
  const safeRedirect = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/'
  redirect(303, safeRedirect)
})
