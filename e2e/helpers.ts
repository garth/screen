import type { Page } from '@playwright/test'

export async function createVerifiedUser(
  page: Page,
  user: { name?: string; firstName?: string; lastName?: string; email: string; password: string },
) {
  // Support both old 'name' and new firstName/lastName
  const data =
    user.firstName ? user : (
      {
        ...user,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
      }
    )

  const response = await page.request.post('/api/test/create-user', {
    data,
  })

  if (!response.ok()) {
    throw new Error(`Failed to create user: ${response.status()}`)
  }

  return response.json()
}

export async function createUnverifiedUser(
  page: Page,
  user: { name?: string; firstName?: string; lastName?: string; email: string; password: string },
): Promise<{ id: string; email: string; verificationToken: string }> {
  // Support both old 'name' and new firstName/lastName
  const data =
    user.firstName ? user : (
      {
        ...user,
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
      }
    )

  const response = await page.request.post('/api/test/create-unverified-user', {
    data,
  })

  if (!response.ok()) {
    throw new Error(`Failed to create unverified user: ${response.status()}`)
  }

  return response.json()
}

export async function loginUser(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/users/log-in')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Password').fill(credentials.password)
  await page.getByRole('button', { name: 'Log In' }).click()
}

export async function createPasswordReset(page: Page, email: string): Promise<{ email: string; resetToken: string }> {
  const response = await page.request.post('/api/test/create-password-reset', {
    data: { email },
  })

  if (!response.ok()) {
    throw new Error(`Failed to create password reset: ${response.status()}`)
  }

  return response.json()
}

export async function createDocument(
  page: Page,
  data: {
    userId: string
    name: string
    type: string
    public?: boolean
    meta?: Record<string, unknown>
    baseDocumentId?: string
  },
): Promise<{
  id: string
  name: string
  type: string
  public: boolean
  baseDocumentId: string | null
}> {
  const response = await page.request.post('/api/test/create-document', { data })

  if (!response.ok()) {
    throw new Error(`Failed to create document: ${response.status()}`)
  }

  return response.json()
}

export async function updateDocument(
  page: Page,
  data: { id: string; baseDocumentId?: string | null },
): Promise<{ id: string; baseDocumentId: string | null }> {
  const response = await page.request.post('/api/test/update-document', { data })

  if (!response.ok()) {
    throw new Error(`Failed to update document: ${response.status()}`)
  }

  return response.json()
}

export async function getDocumentMeta(page: Page, documentId: string): Promise<Record<string, unknown>> {
  const response = await page.request.get(`/api/test/document-meta/${documentId}`)

  if (!response.ok()) {
    throw new Error(`Failed to get document meta: ${response.status()}`)
  }

  return response.json()
}

export async function createChannel(
  page: Page,
  data: {
    userId: string
    eventDocumentId: string
    name: string
    slug: string
  },
): Promise<{
  id: string
  name: string
  slug: string
  eventDocumentId: string
}> {
  const response = await page.request.post('/api/test/create-channel', { data })

  if (!response.ok()) {
    throw new Error(`Failed to create channel: ${response.status()}`)
  }

  return response.json()
}

export async function createDocumentUser(
  page: Page,
  data: { documentId: string; userId: string; write?: boolean },
): Promise<{ id: string; documentId: string; userId: string; write: boolean }> {
  const response = await page.request.post('/api/test/create-document-user', { data })

  if (!response.ok()) {
    throw new Error(`Failed to create document user: ${response.status()}`)
  }

  return response.json()
}
