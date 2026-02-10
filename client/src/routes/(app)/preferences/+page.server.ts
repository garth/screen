import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/db'

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    redirect(303, '/login?redirect=' + url.pathname)
  }

  const user = await db.user.findUnique({
    where: { id: locals.user.id },
    select: {
      firstName: true,
      lastName: true,
    },
  })

  return {
    user: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    },
  }
}
