import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

export const POST: RequestHandler = async ({ request }) => {
  const isTestEnv = dev || env.ALLOW_TEST_ENDPOINTS === 'true'
  if (!isTestEnv) {
    error(404, 'Not found')
  }

  const { documentId, userId, write } = await request.json()

  if (!documentId || !userId) {
    error(400, 'Missing required fields: documentId, userId')
  }

  const documentUser = await db.documentUser.create({
    data: {
      documentId,
      userId,
      canWrite: write ?? false,
    },
  })

  return json({
    id: documentUser.id,
    documentId: documentUser.documentId,
    userId: documentUser.userId,
    write: documentUser.canWrite,
  })
}
