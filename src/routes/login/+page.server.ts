import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url }) => {
  return {
    verified: url.searchParams.get('verified') === 'true',
    reset: url.searchParams.get('reset') === 'true',
  }
}
