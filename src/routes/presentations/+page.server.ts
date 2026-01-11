import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { ensureDocumentList } from '$lib/server/document-list'

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/login')
  }

  // Ensure the user's document-list exists (creates and populates if missing)
  await ensureDocumentList(locals.user.id)

  return {
    userId: locals.user.id,
  }
}
