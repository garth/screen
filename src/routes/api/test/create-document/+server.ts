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

  const { userId, name, type, public: isPublic, meta } = await request.json()

  if (!userId || !name || !type) {
    error(400, 'Missing required fields: userId, name, type')
  }

  const document = await db.document.create({
    data: {
      userId,
      name,
      type,
      public: isPublic ?? false,
      meta: meta ?? {},
    },
  })

  return json({ id: document.id, name: document.name, type: document.type, public: document.public })
}
