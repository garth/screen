import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
  const isTestEnv = dev || env.ALLOW_TEST_ENDPOINTS === 'true'
  return { isTestEnv }
}
