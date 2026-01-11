import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/db'

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/login')
  }

  // Get presentations owned by user OR shared via DocumentUser
  const presentations = await db.document.findMany({
    where: {
      type: 'presentation',
      deletedAt: null,
      OR: [
        { userId: locals.user.id },
        {
          documentUsers: {
            some: {
              userId: locals.user.id,
              deletedAt: null,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      isPublic: true,
      meta: true,
      updatedAt: true,
      userId: true,
      documentUsers: {
        where: { userId: locals.user.id, deletedAt: null },
        select: { canWrite: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return {
    presentations: presentations.map((p) => ({
      id: p.id,
      name: p.name,
      title: (p.meta as { title?: string })?.title || p.name || 'Untitled',
      isPublic: p.isPublic,
      updatedAt: p.updatedAt.toISOString(),
      isOwner: p.userId === locals.user!.id,
      canWrite: p.userId === locals.user!.id || p.documentUsers.some((du) => du.canWrite),
    })),
  }
}
