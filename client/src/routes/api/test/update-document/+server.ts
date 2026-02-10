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

  const { id, baseDocumentId } = await request.json()

  if (!id) {
    error(400, 'Missing required field: id')
  }

  const document = await db.document.update({
    where: { id },
    data: {
      baseDocumentId: baseDocumentId ?? null,
    },
  })

  return json({
    id: document.id,
    baseDocumentId: document.baseDocumentId,
  })
}
