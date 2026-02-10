import { db } from './db'
import * as Y from 'yjs'

// =============================================================================
// Types
// =============================================================================

export interface DocumentListItemData {
  title: string
  type: 'presentation' | 'theme' | 'event'
  isPublic: boolean
  isOwner: boolean
  canWrite: boolean
  updatedAt: string
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the document list ID for a user
 */
export function getDocumentListId(userId: string): string {
  return `user-${userId}-documents`
}

/**
 * Load the current Yjs document state from stored updates
 */
async function loadDocumentState(documentId: string): Promise<Y.Doc> {
  const ydoc = new Y.Doc()

  const updates = await db.documentUpdate.findMany({
    select: { update: true },
    where: { documentId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })

  for (const { update } of updates) {
    Y.applyUpdate(ydoc, new Uint8Array(update))
  }

  return ydoc
}

/**
 * Store a Yjs update to the database
 */
async function storeUpdate(documentId: string, userId: string, ydoc: Y.Doc): Promise<void> {
  const update = Y.encodeStateAsUpdate(ydoc)
  await db.documentUpdate.create({
    data: {
      documentId,
      userId,
      update: Buffer.from(update),
    },
  })
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Ensure a document-list exists for a user. Creates it if missing.
 * Returns true if the list was newly created.
 */
export async function ensureDocumentList(userId: string): Promise<boolean> {
  const documentId = getDocumentListId(userId)

  const existing = await db.document.findUnique({
    select: { id: true },
    where: { id: documentId },
  })

  if (existing) {
    return false
  }

  // Create the document-list record
  await db.document.create({
    data: {
      id: documentId,
      userId,
      name: 'My Documents',
      type: 'document-list',
      isPublic: false,
      meta: {},
    },
  })

  // Build initial list from user's existing documents
  await rebuildDocumentList(userId)

  return true
}

/**
 * Sync a single document to the user's document-list
 */
export async function syncToDocumentList(
  userId: string,
  documentId: string,
  action: 'add' | 'update' | 'remove',
  metadata?: DocumentListItemData,
): Promise<void> {
  const listId = getDocumentListId(userId)

  // Ensure the document-list exists
  const listDoc = await db.document.findUnique({
    select: { id: true },
    where: { id: listId },
  })

  if (!listDoc) {
    // Document list doesn't exist yet, will be created on next layout load
    return
  }

  // Load current state
  const ydoc = await loadDocumentState(listId)
  const documentsMap = ydoc.getMap<DocumentListItemData>('documents')

  if (action === 'remove') {
    documentsMap.delete(documentId)
  } else if (metadata) {
    documentsMap.set(documentId, metadata)
  }

  // Store the update
  await storeUpdate(listId, userId, ydoc)

  ydoc.destroy()
}

/**
 * Rebuild the entire document-list from the database.
 * Useful for initial creation or recovery.
 */
export async function rebuildDocumentList(userId: string): Promise<void> {
  const listId = getDocumentListId(userId)

  // Get all documents the user owns or has access to
  const documents = await db.document.findMany({
    where: {
      type: { not: 'document-list' },
      deletedAt: null,
      OR: [
        { userId },
        {
          documentUsers: {
            some: {
              userId,
              deletedAt: null,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      type: true,
      isPublic: true,
      meta: true,
      updatedAt: true,
      userId: true,
      documentUsers: {
        where: { userId, deletedAt: null },
        select: { canWrite: true },
      },
    },
  })

  // Create new Yjs doc with all documents
  const ydoc = new Y.Doc()
  const documentsMap = ydoc.getMap<DocumentListItemData>('documents')

  for (const doc of documents) {
    const meta = doc.meta as { title?: string } | null
    const isOwner = doc.userId === userId
    const canWrite = isOwner || doc.documentUsers.some((du) => du.canWrite)

    documentsMap.set(doc.id, {
      title: meta?.title || doc.name || 'Untitled',
      type: doc.type as 'presentation' | 'theme' | 'event',
      isPublic: doc.isPublic,
      isOwner,
      canWrite,
      updatedAt: doc.updatedAt.toISOString(),
    })
  }

  // Store the full state as an update
  await storeUpdate(listId, userId, ydoc)

  ydoc.destroy()
}

/**
 * Get document metadata for syncing to list
 */
export async function getDocumentMetadata(documentId: string, forUserId: string): Promise<DocumentListItemData | null> {
  const doc = await db.document.findUnique({
    where: { id: documentId, deletedAt: null },
    select: {
      name: true,
      type: true,
      isPublic: true,
      meta: true,
      updatedAt: true,
      userId: true,
      documentUsers: {
        where: { userId: forUserId, deletedAt: null },
        select: { canWrite: true },
      },
    },
  })

  if (!doc) return null

  const meta = doc.meta as { title?: string } | null
  const isOwner = doc.userId === forUserId
  const canWrite = isOwner || doc.documentUsers.some((du) => du.canWrite)

  return {
    title: meta?.title || doc.name || 'Untitled',
    type: doc.type as 'presentation' | 'theme' | 'event',
    isPublic: doc.isPublic,
    isOwner,
    canWrite,
    updatedAt: doc.updatedAt.toISOString(),
  }
}
