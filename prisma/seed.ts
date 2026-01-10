import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from '@node-rs/argon2'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const db = new PrismaClient({ adapter })

async function hashPassword(password: string) {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  })
}

async function main() {
  console.log('Seeding database...')

  // Create user
  const passwordHash = await hashPassword('testtest')
  const user = await db.user.upsert({
    where: { email: 'test@example.com' },
    update: { name: 'Alex Johnson', passwordHash },
    create: {
      name: 'Alex Johnson',
      email: 'test@example.com',
      passwordHash,
    },
  })
  console.log(`Created user: ${user.name} (${user.email})`)
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
