import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getStorageMode,
  getStorageProvider,
  resetStorageProviderCache,
} from '@/lib/storage'
import { isStorageError, makeStorageError } from '@/lib/storage/types'

describe('storage: factory + mode resolution', () => {
  beforeEach(() => {
    resetStorageProviderCache()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    resetStorageProviderCache()
  })

  it('defaults to server-fixed-session on the server', () => {
    const orig = (globalThis as { window?: unknown }).window
    delete (globalThis as { window?: unknown }).window
    try {
      expect(getStorageMode()).toBe('server-fixed-session')
    } finally {
      ;(globalThis as { window?: unknown }).window = orig
    }
  })

  it('factory resolves to ServerFixedSessionProvider by default', async () => {
    const p = await getStorageProvider()
    expect(p.mode).toBe('server-fixed-session')
  })

  it('cache returns the same instance across calls', async () => {
    const a = await getStorageProvider()
    const b = await getStorageProvider()
    expect(a).toBe(b)
  })
})

describe('storage: error helpers', () => {
  it('makeStorageError shapes a typed error', () => {
    const e = makeStorageError('STORAGE_NOT_READY', 'still loading', { retryable: true })
    expect(e.code).toBe('STORAGE_NOT_READY')
    expect(e.retryable).toBe(true)
  })

  it('isStorageError narrows correctly', () => {
    expect(isStorageError(makeStorageError('AUTH_X', 'x'))).toBe(true)
    expect(isStorageError(new Error('x'))).toBe(false)
    expect(isStorageError(null)).toBe(false)
    expect(isStorageError({ code: 42, message: 'no' })).toBe(false)
  })
})

describe('storage: ServerFixedSessionProvider', () => {
  beforeEach(() => {
    resetStorageProviderCache()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    resetStorageProviderCache()
  })

  it('ensureSession POSTs once and caches the result', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ clip: { id: 'demo-session' } }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { ServerFixedSessionProvider } = await import('@/lib/storage/server-fixed-session')
    const p = new ServerFixedSessionProvider()
    const id1 = await p.ensureSession()
    const id2 = await p.ensureSession()
    expect(id1).toBe('demo-session')
    expect(id2).toBe('demo-session')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/clips')
    expect(init?.method).toBe('POST')
    const body = JSON.parse(String(init?.body ?? '{}'))
    expect(body.id).toBe('demo-session')
  })

  it('ensureSession treats 409 as success (idempotent reuse)', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('', { status: 409 }))
    vi.stubGlobal('fetch', fetchMock)
    const { ServerFixedSessionProvider } = await import('@/lib/storage/server-fixed-session')
    const p = new ServerFixedSessionProvider()
    const id = await p.ensureSession()
    expect(id).toBe('demo-session')
  })

  it('callGenerate throws StorageError on backend failure', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clip: { id: 'demo-session' } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'AUTH_API_KEY_INVALID', message: 'no key' } }), { status: 401 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const { ServerFixedSessionProvider } = await import('@/lib/storage/server-fixed-session')
    const p = new ServerFixedSessionProvider()
    await expect(
      p.callGenerate({ scenePrompt: 'hi', durationSeconds: 5 }),
    ).rejects.toMatchObject({ code: 'AUTH_API_KEY_INVALID' })
  })

  it('composition returns a factory for the given clipId', async () => {
    const { ServerFixedSessionProvider } = await import('@/lib/storage/server-fixed-session')
    const p = new ServerFixedSessionProvider()
    const factory = p.composition('demo-session')
    expect(typeof factory).toBe('function')
  })
})

describe('storage: ClientIndexedDBProvider stub', () => {
  it('throws STORAGE_NOT_IMPLEMENTED on ensureSession', async () => {
    const { ClientIndexedDBProvider } = await import('@/lib/storage/client-indexed-db')
    const p = new ClientIndexedDBProvider()
    await expect(p.ensureSession()).rejects.toMatchObject({ code: 'STORAGE_NOT_IMPLEMENTED' })
  })
})
