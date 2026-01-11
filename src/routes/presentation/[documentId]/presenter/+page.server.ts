import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { permissions } = await parent()

  // Require authentication
  if (!locals.user) {
    redirect(303, '/login')
  }

  // Require write permission for presenter mode
  if (!permissions.canWrite) {
    error(403, 'You do not have permission to present this presentation')
  }

  return {}
}
