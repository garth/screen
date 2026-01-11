import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    error(401, 'Authentication required')
  }

  const document = await db.document.create({
    data: {
      userId: locals.user.id,
      name: 'Untitled Presentation',
      type: 'presentation',
      isPublic: false,
      meta: {
        title: '',
      },
    },
  })

  return json({ id: document.id })
}
