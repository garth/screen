import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from '@node-rs/argon2'
import { generatePresentationName } from '../src/lib/utils/name-generator'

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
    update: { firstName: 'Alex', lastName: 'Johnson', passwordHash },
    create: {
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'test@example.com',
      passwordHash,
      confirmedAt: new Date(),
    },
  })
  console.log(`Created user: ${user.firstName} ${user.lastName} (${user.email})`)

  // Create a sample presentation
  const presentationName = generatePresentationName()
  const presentation = await db.document.create({
    data: {
      userId: user.id,
      name: presentationName,
      type: 'presentation',
      isPublic: false,
      meta: {
        title: presentationName,
      },
    },
  })
  console.log(`Created presentation: ${presentation.name}`)

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
