import { error, redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { db } from '$lib/server/db'

export const load: LayoutServerLoad = async ({ locals, params }) => {
  const document = await db.document.findUnique({
    where: { id: params.documentId, type: 'presentation', deletedAt: null },
    select: {
      id: true,
      name: true,
      isPublic: true,
      meta: true,
      userId: true,
      baseDocumentId: true,
      documentUsers: {
        where: { deletedAt: null },
        select: { userId: true, canWrite: true },
      },
    },
  })

  if (!document) {
    error(404, 'Presentation not found')
  }

  const isOwner = locals.user?.id === document.userId
  const documentUser = document.documentUsers.find((du) => du.userId === locals.user?.id)
  const canAccess = document.isPublic || isOwner || documentUser !== undefined
  const canWrite = isOwner || (documentUser?.canWrite ?? false)

  // For private documents, require authentication
  if (!document.isPublic && !locals.user) {
    redirect(303, `/login?redirect=/presentation/${params.documentId}`)
  }

  if (!canAccess) {
    error(403, 'Access denied')
  }

  const meta = document.meta as {
    title?: string
    themeId?: string | null
    font?: string
    backgroundColor?: string
    textColor?: string
  }

  return {
    document: {
      id: document.id,
      name: document.name,
      title: meta?.title || document.name || 'Untitled',
      themeId: meta?.themeId || null,
      font: meta?.font,
      backgroundColor: meta?.backgroundColor,
      textColor: meta?.textColor,
      isPublic: document.isPublic,
      baseDocumentId: document.baseDocumentId,
    },
    permissions: {
      isOwner,
      canWrite,
      canAccess,
    },
  }
}
