import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as Y from 'yjs'

// Mock the database - use factory function to avoid hoisting issues
vi.mock('./db', () => {
  const mockDb = {
    document: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    documentUpdate: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  }
  return { db: mockDb }
})

// Import the mocked db after the mock is set up
import { db } from './db'
const mockDb = db as {
  document: {
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  documentUpdate: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
}

import {
  getDocumentListId,
  ensureDocumentList,
  syncToDocumentList,
  rebuildDocumentList,
  getDocumentMetadata,
} from './document-list'

describe('getDocumentListId', () => {
  it('returns correct document list ID', () => {
    expect(getDocumentListId('user123')).toBe('user-user123-documents')
    expect(getDocumentListId('abc')).toBe('user-abc-documents')
  })
})

describe('ensureDocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false if document list already exists', async () => {
    mockDb.document.findUnique.mockResolvedValue({ id: 'user-user123-documents' })

    const created = await ensureDocumentList('user123')

    expect(created).toBe(false)
    expect(mockDb.document.create).not.toHaveBeenCalled()
  })

  it('creates document list if it does not exist', async () => {
    mockDb.document.findUnique.mockResolvedValue(null)
    mockDb.document.create.mockResolvedValue({ id: 'user-user123-documents' })
    mockDb.document.findMany.mockResolvedValue([]) // No existing documents
    mockDb.documentUpdate.create.mockResolvedValue({})

    const created = await ensureDocumentList('user123')

    expect(created).toBe(true)
    expect(mockDb.document.create).toHaveBeenCalledWith({
      data: {
        id: 'user-user123-documents',
        userId: 'user123',
        name: 'My Documents',
        type: 'document-list',
        isPublic: false,
        meta: {},
      },
    })
  })

  it('populates list with existing documents on creation', async () => {
    mockDb.document.findUnique.mockResolvedValue(null)
    mockDb.document.create.mockResolvedValue({ id: 'user-user123-documents' })
    mockDb.document.findMany.mockResolvedValue([
      {
        id: 'pres-1',
        name: 'Presentation 1',
        type: 'presentation',
        isPublic: false,
        meta: { title: 'My Presentation' },
        updatedAt: new Date('2024-01-15'),
        userId: 'user123',
        documentUsers: [],
      },
    ])
    mockDb.documentUpdate.create.mockResolvedValue({})
    mockDb.documentUpdate.findMany.mockResolvedValue([])

    await ensureDocumentList('user123')

    // Should have called rebuildDocumentList which creates an update
    expect(mockDb.documentUpdate.create).toHaveBeenCalled()
  })
})

describe('syncToDocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing if document list does not exist', async () => {
    mockDb.document.findUnique.mockResolvedValue(null)

    await syncToDocumentList('user123', 'doc-1', 'add', {
      title: 'Test',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    expect(mockDb.documentUpdate.create).not.toHaveBeenCalled()
  })

  it('adds document to list', async () => {
    mockDb.document.findUnique.mockResolvedValue({ id: 'user-user123-documents' })
    mockDb.documentUpdate.findMany.mockResolvedValue([])
    mockDb.documentUpdate.create.mockResolvedValue({})

    await syncToDocumentList('user123', 'doc-1', 'add', {
      title: 'New Document',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })

    expect(mockDb.documentUpdate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'user-user123-documents',
        userId: 'user123',
        update: expect.any(Buffer),
      }),
    })
  })

  it('updates existing document in list', async () => {
    // Create initial state with a document
    const ydoc = new Y.Doc()
    const documentsMap = ydoc.getMap('documents')
    documentsMap.set('doc-1', {
      title: 'Original Title',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })
    const initialUpdate = Y.encodeStateAsUpdate(ydoc)
    ydoc.destroy()

    mockDb.document.findUnique.mockResolvedValue({ id: 'user-user123-documents' })
    mockDb.documentUpdate.findMany.mockResolvedValue([{ update: Buffer.from(initialUpdate) }])
    mockDb.documentUpdate.create.mockResolvedValue({})

    await syncToDocumentList('user123', 'doc-1', 'update', {
      title: 'Updated Title',
      type: 'presentation',
      isPublic: true,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-16T10:00:00Z',
    })

    expect(mockDb.documentUpdate.create).toHaveBeenCalled()

    // Verify the update contains the new title
    const call = mockDb.documentUpdate.create.mock.calls[0][0]
    const newYdoc = new Y.Doc()
    Y.applyUpdate(newYdoc, new Uint8Array(call.data.update))
    const newMap = newYdoc.getMap('documents')
    const docData = newMap.get('doc-1') as { title: string; isPublic: boolean }
    expect(docData.title).toBe('Updated Title')
    expect(docData.isPublic).toBe(true)
    newYdoc.destroy()
  })

  it('removes document from list', async () => {
    // Create initial state with a document
    const ydoc = new Y.Doc()
    const documentsMap = ydoc.getMap('documents')
    documentsMap.set('doc-1', {
      title: 'To Be Removed',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00Z',
    })
    const initialUpdate = Y.encodeStateAsUpdate(ydoc)
    ydoc.destroy()

    mockDb.document.findUnique.mockResolvedValue({ id: 'user-user123-documents' })
    mockDb.documentUpdate.findMany.mockResolvedValue([{ update: Buffer.from(initialUpdate) }])
    mockDb.documentUpdate.create.mockResolvedValue({})

    await syncToDocumentList('user123', 'doc-1', 'remove')

    expect(mockDb.documentUpdate.create).toHaveBeenCalled()

    // Verify the document was removed
    const call = mockDb.documentUpdate.create.mock.calls[0][0]
    const newYdoc = new Y.Doc()
    Y.applyUpdate(newYdoc, new Uint8Array(call.data.update))
    const newMap = newYdoc.getMap('documents')
    expect(newMap.has('doc-1')).toBe(false)
    newYdoc.destroy()
  })
})

describe('rebuildDocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates Yjs state with all user documents', async () => {
    mockDb.document.findMany.mockResolvedValue([
      {
        id: 'pres-1',
        name: 'Presentation 1',
        type: 'presentation',
        isPublic: false,
        meta: { title: 'My Presentation' },
        updatedAt: new Date('2024-01-15'),
        userId: 'user123',
        documentUsers: [],
      },
      {
        id: 'theme-1',
        name: 'Theme 1',
        type: 'theme',
        isPublic: true,
        meta: {},
        updatedAt: new Date('2024-01-14'),
        userId: 'user123',
        documentUsers: [],
      },
    ])
    mockDb.documentUpdate.create.mockResolvedValue({})

    await rebuildDocumentList('user123')

    expect(mockDb.documentUpdate.create).toHaveBeenCalled()

    // Verify the created state
    const call = mockDb.documentUpdate.create.mock.calls[0][0]
    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, new Uint8Array(call.data.update))
    const map = ydoc.getMap('documents')

    expect(map.size).toBe(2)
    expect(map.has('pres-1')).toBe(true)
    expect(map.has('theme-1')).toBe(true)

    const pres = map.get('pres-1') as { title: string; type: string }
    expect(pres.title).toBe('My Presentation')
    expect(pres.type).toBe('presentation')

    ydoc.destroy()
  })

  it('includes shared documents', async () => {
    mockDb.document.findMany.mockResolvedValue([
      {
        id: 'shared-1',
        name: 'Shared Doc',
        type: 'presentation',
        isPublic: false,
        meta: { title: 'Shared Presentation' },
        updatedAt: new Date('2024-01-15'),
        userId: 'other-user',
        documentUsers: [{ canWrite: true }],
      },
    ])
    mockDb.documentUpdate.create.mockResolvedValue({})

    await rebuildDocumentList('user123')

    const call = mockDb.documentUpdate.create.mock.calls[0][0]
    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, new Uint8Array(call.data.update))
    const map = ydoc.getMap('documents')

    const shared = map.get('shared-1') as { isOwner: boolean; canWrite: boolean }
    expect(shared.isOwner).toBe(false)
    expect(shared.canWrite).toBe(true)

    ydoc.destroy()
  })

  it('uses document name as title fallback', async () => {
    mockDb.document.findMany.mockResolvedValue([
      {
        id: 'no-title',
        name: 'Fallback Name',
        type: 'presentation',
        isPublic: false,
        meta: {},
        updatedAt: new Date('2024-01-15'),
        userId: 'user123',
        documentUsers: [],
      },
    ])
    mockDb.documentUpdate.create.mockResolvedValue({})

    await rebuildDocumentList('user123')

    const call = mockDb.documentUpdate.create.mock.calls[0][0]
    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, new Uint8Array(call.data.update))
    const map = ydoc.getMap('documents')

    const doc = map.get('no-title') as { title: string }
    expect(doc.title).toBe('Fallback Name')

    ydoc.destroy()
  })
})

describe('getDocumentMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for non-existent document', async () => {
    mockDb.document.findUnique.mockResolvedValue(null)

    const result = await getDocumentMetadata('non-existent', 'user123')

    expect(result).toBeNull()
  })

  it('returns metadata for owned document', async () => {
    mockDb.document.findUnique.mockResolvedValue({
      name: 'Test Doc',
      type: 'presentation',
      isPublic: false,
      meta: { title: 'Test Presentation' },
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      userId: 'user123',
      documentUsers: [],
    })

    const result = await getDocumentMetadata('doc-1', 'user123')

    expect(result).toEqual({
      title: 'Test Presentation',
      type: 'presentation',
      isPublic: false,
      isOwner: true,
      canWrite: true,
      updatedAt: '2024-01-15T10:00:00.000Z',
    })
  })

  it('returns metadata for shared document', async () => {
    mockDb.document.findUnique.mockResolvedValue({
      name: 'Shared Doc',
      type: 'presentation',
      isPublic: false,
      meta: { title: 'Shared Presentation' },
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      userId: 'other-user',
      documentUsers: [{ canWrite: false }],
    })

    const result = await getDocumentMetadata('doc-1', 'user123')

    expect(result).toEqual({
      title: 'Shared Presentation',
      type: 'presentation',
      isPublic: false,
      isOwner: false,
      canWrite: false,
      updatedAt: '2024-01-15T10:00:00.000Z',
    })
  })

  it('uses document name as title fallback', async () => {
    mockDb.document.findUnique.mockResolvedValue({
      name: 'Fallback Name',
      type: 'presentation',
      isPublic: false,
      meta: null,
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      userId: 'user123',
      documentUsers: [],
    })

    const result = await getDocumentMetadata('doc-1', 'user123')

    expect(result?.title).toBe('Fallback Name')
  })
})
