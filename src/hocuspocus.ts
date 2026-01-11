import 'dotenv/config'
import { Logger } from '@hocuspocus/extension-logger'
import { Server } from '@hocuspocus/server'
import { PrismaClient } from '../generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'
import { sha256 } from '@oslojs/crypto/sha2'
import { encodeHexLowerCase } from '@oslojs/encoding'
import cookie from 'cookie'
import * as Y from 'yjs'

if (process.env.DATABASE_URL == null) {
  throw new Error('DATABASE_URL is not set')
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

const sessionCookieName = 'auth-session'

async function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
  const result = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!result) {
    return { session: null, user: null }
  }

  const { user, ...session } = result

  const sessionExpired = Date.now() >= session.expiresAt.getTime()
  if (sessionExpired) {
    await db.session.delete({ where: { id: session.id } })
    return { session: null, user: null }
  }

  return { session, user }
}

// Helper to check document permissions for a user
async function checkDocumentPermissions(
  documentId: string,
  userId: string | null,
): Promise<{ allowed: boolean; readOnly: boolean }> {
  if (userId) {
    // Authenticated user - check ownership or shared access
    const doc = await db.document.findUnique({
      select: {
        userId: true,
        public: true,
        documentUsers: {
          select: {
            userId: true,
            write: true,
          },
          where: {
            userId,
            deletedAt: null,
          },
        },
      },
      where: {
        id: documentId,
        deletedAt: null,
      },
    })

    if (!doc) {
      return { allowed: false, readOnly: true }
    }

    // Owner, shared user, or public doc
    const isOwner = doc.userId === userId
    const isSharedUser = doc.documentUsers.length > 0
    const isPublic = doc.public === true

    if (!isOwner && !isSharedUser && !isPublic) {
      return { allowed: false, readOnly: true }
    }

    // Determine write access
    const canWrite = isOwner || doc.documentUsers.some((u) => u.write === true)
    return { allowed: true, readOnly: !canWrite }
  } else {
    // Anonymous user - only public docs
    const doc = await db.document.findUnique({
      select: { id: true },
      where: {
        id: documentId,
        deletedAt: null,
        public: true,
      },
    })

    return { allowed: doc != null, readOnly: true }
  }
}

const server = new Server({
  name: 'sync',
  timeout: 30_000,
  debounce: 2_000,
  maxDebounce: 10_000,
  port: parseInt(process.env.HOCUSPOCUS_PORT || '1234'),

  extensions: [new Logger()],

  onLoadDocument: async ({ documentName, document }) => {
    const doc = await db.document.findUnique({
      select: {
        documentUpdates: {
          select: {
            update: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      where: {
        id: documentName,
        deletedAt: null,
      },
    })

    doc?.documentUpdates.forEach(({ update }) => {
      Y.applyUpdate(document, new Uint8Array(update))
    })

    return document
  },

  onChange: async ({ documentName, update, context }) => {
    const userId: string | undefined = context.userId

    if (userId != null && userId !== '') {
      await db.documentUpdate.create({
        data: {
          documentId: documentName,
          userId,
          update: Buffer.from(update),
        },
      })
    }
  },

  async onConnect({ documentName, connectionConfig, requestHeaders }) {
    // Try cookie-based authentication first
    const cookies = cookie.parse(requestHeaders.cookie ?? '')
    const sessionToken = cookies[sessionCookieName]
    const { user } = sessionToken ? await validateSessionToken(sessionToken) : { user: null }

    if (user) {
      // Authenticated via cookie - check permissions immediately
      const { allowed, readOnly } = await checkDocumentPermissions(documentName, user.id)
      if (!allowed) {
        throw new Error('Document not found')
      }
      connectionConfig.readOnly = readOnly
      return { userId: user.id }
    }

    // No cookie auth - check if document is public
    const doc = await db.document.findUnique({
      select: { id: true, public: true },
      where: { id: documentName, deletedAt: null },
    })

    if (!doc) {
      throw new Error('Document not found')
    }

    if (doc.public) {
      // Public document - allow read-only access
      connectionConfig.readOnly = true
      return { userId: undefined, requiresAuth: false }
    }

    // Private document without cookie - require token auth
    // Mark as needing authentication, will be verified in onAuthenticate
    return { userId: undefined, requiresAuth: true, documentId: documentName }
  },

  async onAuthenticate({ token, documentName, context, connectionConfig }) {
    // Token auth is used when cookies aren't available (e.g., e2e tests)
    // The token is the session cookie value
    if (!token) {
      // Check if auth was already done via cookie
      if (context.userId) {
        return context
      }
      // Check if doc is public (no auth needed)
      if (context.requiresAuth === false) {
        return context
      }
      throw new Error('Authentication required')
    }

    const { user } = await validateSessionToken(token)
    if (!user) {
      throw new Error('Invalid token')
    }

    const { allowed, readOnly } = await checkDocumentPermissions(documentName, user.id)
    if (!allowed) {
      throw new Error('Access denied')
    }

    connectionConfig.readOnly = readOnly
    return { userId: user.id }
  },
})

server.listen()
