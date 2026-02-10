import { PrismaClient } from '~/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '$env/dynamic/private'

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const db = new PrismaClient({ adapter })
