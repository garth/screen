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

export const DELETE: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    error(401, 'Authentication required')
  }

  const documentId = url.searchParams.get('id')
  if (!documentId) {
    error(400, 'Document ID required')
  }

  // Verify user owns this document
  const document = await db.document.findUnique({
    where: { id: documentId, userId: locals.user.id, deletedAt: null },
  })

  if (!document) {
    error(404, 'Presentation not found')
  }

  // Soft delete
  await db.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
  })

  // Sync removal to document-list
  await syncToDocumentList(locals.user.id, documentId, 'remove')

  return new Response(null, { status: 204 })
}
