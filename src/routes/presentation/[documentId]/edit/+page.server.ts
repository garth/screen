import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/db'

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { permissions } = await parent()

  // Require authentication
  if (!locals.user) {
    redirect(303, '/login')
  }

  // Require write permission
  if (!permissions.canWrite) {
    error(403, 'You do not have permission to edit this presentation')
  }

  // Load available themes for the picker
  const themes = await db.document.findMany({
    where: {
      type: 'theme',
      deletedAt: null,
      OR: [
        { isPublic: true },
        { userId: locals.user.id },
        {
          documentUsers: {
            some: { userId: locals.user.id, deletedAt: null },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      meta: true,
      userId: true,
    },
    orderBy: [{ name: 'asc' }],
  })

  return {
    themes: themes.map((t) => {
      const meta = t.meta as { isSystemTheme?: boolean } | null
      return {
        id: t.id,
        name: t.name || 'Untitled Theme',
        isSystemTheme: meta?.isSystemTheme ?? false,
        isOwner: t.userId === locals.user!.id,
      }
    }),
    user: {
      id: locals.user.id,
      name: `${locals.user.firstName} ${locals.user.lastName}`.trim() || 'Anonymous',
    },
  }
}
