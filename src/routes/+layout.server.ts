import type { LayoutServerLoad } from './$types'
import { gravatarUrl } from '$lib/server/gravatar'

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user:
      locals.user ?
        {
          ...locals.user,
          gravatarUrl: gravatarUrl(locals.user.email),
        }
      : null,
  }
}
