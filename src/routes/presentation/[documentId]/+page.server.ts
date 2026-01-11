import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
  // Parent layout handles auth and document loading
  await parent()
  return {}
}
