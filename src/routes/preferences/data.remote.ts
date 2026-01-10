import * as v from 'valibot'
import { error } from '@sveltejs/kit'
import { command, form, getRequestEvent } from '$app/server'
import { db } from '$lib/server/db'
import { hash, verify } from '@node-rs/argon2'
import { deleteSessionTokenCookie } from '$lib/server/auth'

const updateNameSchema = v.object({
  firstName: v.pipe(v.string(), v.nonEmpty('First name is required')),
  lastName: v.pipe(v.string(), v.nonEmpty('Last name is required')),
})

export const updateName = form(updateNameSchema, async (data) => {
  const { locals } = getRequestEvent()
  if (!locals.user) error(401, 'Unauthorized')

  await db.user.update({
    where: { id: locals.user.id },
    data: { firstName: data.firstName, lastName: data.lastName },
  })
})

const updatePasswordSchema = v.object({
  currentPassword: v.pipe(v.string(), v.nonEmpty('Current password is required')),
  newPassword: v.pipe(v.string(), v.minLength(8, 'Password must be at least 8 characters')),
  confirmPassword: v.string(),
})

export const updatePassword = form(updatePasswordSchema, async (data) => {
  const { locals } = getRequestEvent()
  if (!locals.user) error(401, 'Unauthorized')

  if (data.newPassword !== data.confirmPassword) {
    error(400, 'Passwords do not match')
  }

  const user = await db.user.findUnique({ where: { id: locals.user.id } })
  if (!user) error(404, 'User not found')

  const valid = await verify(user.passwordHash, data.currentPassword)
  if (!valid) error(400, 'Current password is incorrect')

  const passwordHash = await hash(data.newPassword)
  await db.user.update({
    where: { id: locals.user.id },
    data: { passwordHash },
  })
})

export const deleteAccount = command(async () => {
  const event = getRequestEvent()
  if (!event.locals.user) error(401, 'Unauthorized')

  const userId = event.locals.user.id

  await db.$transaction(async (tx) => {
    // Delete all user's document relationships
    await tx.documentUser.deleteMany({ where: { userId } })

    // Delete all user's document updates
    await tx.documentUpdate.deleteMany({ where: { userId } })

    // Delete all user's documents
    await tx.document.deleteMany({ where: { userId } })

    // Delete all user's sessions
    await tx.session.deleteMany({ where: { userId } })

    // Delete the user
    await tx.user.delete({ where: { id: userId } })
  })

  deleteSessionTokenCookie(event)
})
