import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

export const GET: RequestHandler = async ({ params }) => {
  const isTestEnv = dev || env.ALLOW_TEST_ENDPOINTS === 'true'
  if (!isTestEnv) {
    error(404, 'Not found')
  }

  const { documentId } = params

  const document = await db.document.findUnique({
    where: { id: documentId },
    select: { meta: true },
  })

  if (!document) {
    error(404, 'Document not found')
  }

  return json(document.meta)
}
