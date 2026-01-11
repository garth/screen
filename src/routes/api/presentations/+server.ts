import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { syncToDocumentList } from '$lib/server/document-list'
import { generatePresentationName } from '$lib/utils/name-generator'

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    error(401, 'Authentication required')
  }

  const name = generatePresentationName()

  const document = await db.document.create({
    data: {
      userId: locals.user.id,
      name,
      type: 'presentation',
      isPublic: false,
      meta: {
        title: name,
      },
    },
  })

  // Sync to user's document-list for offline access
  await syncToDocumentList(locals.user.id, document.id, 'add', {
    title: name,
    type: 'presentation',
    isPublic: false,
    isOwner: true,
    canWrite: true,
    updatedAt: document.createdAt.toISOString(),
  })

  return json({ id: document.id })
}
