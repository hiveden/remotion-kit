import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import { promises as fs } from 'node:fs'

// Must set the workspace override BEFORE importing the route.
let TMP_ROOT: string
process.env.ASTRAL_ROOT_OVERRIDE = (TMP_ROOT = path.join(
  os.tmpdir(),
  `clips-route-test-${Date.now()}`,
))

const { POST } = await import('@/app/api/clips/route')

interface CreateResp {
  clip?: { id: string; name: string; createdAt: string; updatedAt: string }
  error?: { code: string; message: string }
}

function makeReq(body: unknown): Request {
  return new Request('http://127.0.0.1:3200/api/clips', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(async () => {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
})
afterEach(async () => {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
})

describe('POST /api/clips', () => {
  describe('without id (original generate-id path)', () => {
    it('returns 201 and creates a new clip with a server-generated id', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ name: 'Hello' }))
      expect(res.status).toBe(201)
      const body = (await res.json()) as CreateResp
      expect(body.clip).toBeDefined()
      expect(body.clip!.id).toMatch(/^hello-[0-9a-f]{8}$/)
      expect(body.clip!.name).toBe('Hello')
    })

    it('defaults name to "Untitled clip" when missing', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({}))
      expect(res.status).toBe(201)
      const body = (await res.json()) as CreateResp
      expect(body.clip!.name).toBe('Untitled clip')
    })
  })

  describe('with id (idempotent ensure path)', () => {
    it('returns 201 and creates when id does not exist', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ id: 'demo-session', name: 'Demo Session' }))
      expect(res.status).toBe(201)
      const body = (await res.json()) as CreateResp
      expect(body.clip!.id).toBe('demo-session')
      expect(body.clip!.name).toBe('Demo Session')
    })

    it('returns 200 and reuses existing clip without touching disk', async () => {
      // First create.
      // @ts-expect-error Next.js Request shape compatible
      const first = await POST(makeReq({ id: 'demo-session', name: 'Demo Session' }))
      expect(first.status).toBe(201)
      const created = ((await first.json()) as CreateResp).clip!

      // Capture mtime of the on-disk brief.
      const briefPath = path.join(TMP_ROOT, '.workspace', 'clips', 'demo-session', 'brief.json')
      const statBefore = await fs.stat(briefPath)

      // Second call should be idempotent.
      // @ts-expect-error Next.js Request shape compatible
      const second = await POST(makeReq({ id: 'demo-session', name: 'Different Name' }))
      expect(second.status).toBe(200)
      const reused = ((await second.json()) as CreateResp).clip!

      // Same id and name preserved from initial create (we do NOT update name on reuse).
      expect(reused.id).toBe('demo-session')
      expect(reused.name).toBe('Demo Session')
      expect(reused.createdAt).toBe(created.createdAt)

      const statAfter = await fs.stat(briefPath)
      expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs)
    })

    it('rejects invalid ids with 400 VALIDATION_INVALID_CLIP_ID', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ id: '../etc/passwd', name: 'evil' }))
      expect(res.status).toBe(400)
      const body = (await res.json()) as CreateResp
      expect(body.error?.code).toBe('VALIDATION_INVALID_CLIP_ID')
    })

    it('rejects empty-string ids with 400', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ id: '', name: 'x' }))
      expect(res.status).toBe(400)
      const body = (await res.json()) as CreateResp
      expect(body.error?.code).toBe('VALIDATION_INVALID_CLIP_ID')
    })

    it('rejects non-string ids with 400', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ id: 42, name: 'x' }))
      expect(res.status).toBe(400)
      const body = (await res.json()) as CreateResp
      expect(body.error?.code).toBe('VALIDATION_INVALID_CLIP_ID')
    })

    it('accepts a name default when id is provided without name', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ id: 'demo-session' }))
      expect(res.status).toBe(201)
      const body = (await res.json()) as CreateResp
      expect(body.clip!.name).toBe('Untitled clip')
    })
  })

  describe('error responses', () => {
    it('400 on invalid JSON body', async () => {
      const req = new Request('http://127.0.0.1:3200/api/clips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      })
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = (await res.json()) as CreateResp
      expect(body.error?.code).toBe('VALIDATION_INVALID_JSON')
    })
  })
})
