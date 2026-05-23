import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import { promises as fs } from 'node:fs'

let TMP_ROOT: string
process.env.ASTRAL_ROOT_OVERRIDE = (TMP_ROOT = path.join(
  os.tmpdir(),
  `clip-exists-test-${Date.now()}`,
))

const { GET } = await import('@/app/api/clips/[id]/exists/route')

interface ExistsResp {
  exists: boolean
  meta?: {
    generatedAt: string | null
    codeLength: number | null
    provider: string | null
    model: string | null
  }
  error?: { code: string; message: string }
}

function makeReq(id: string): { request: Request; ctx: { params: Promise<{ id: string }> } } {
  return {
    request: new Request(`http://127.0.0.1:3200/api/clips/${id}/exists`),
    ctx: { params: Promise.resolve({ id }) },
  }
}

async function ensureClipDir(id: string): Promise<string> {
  const dir = path.join(TMP_ROOT, '.workspace', 'clips', id)
  await fs.mkdir(path.join(dir, '.meta'), { recursive: true })
  return dir
}

async function writeRecord(id: string, record: Record<string, unknown>): Promise<void> {
  const dir = await ensureClipDir(id)
  await fs.writeFile(path.join(dir, '.meta', 'last-generate.json'), JSON.stringify(record), 'utf8')
}

beforeEach(async () => {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
})
afterEach(async () => {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
})

describe('GET /api/clips/[id]/exists', () => {
  describe('exists: false', () => {
    it('returns { exists: false } when clip dir does not exist', async () => {
      const { request, ctx } = makeReq('demo-session')
      // @ts-expect-error Next.js Request shape compatible
      const res = await GET(request, ctx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as ExistsResp
      expect(body.exists).toBe(false)
      expect(body.meta).toBeUndefined()
    })

    it('returns { exists: false } when clip dir exists but .meta/last-generate.json missing', async () => {
      await ensureClipDir('demo-session')
      const { request, ctx } = makeReq('demo-session')
      // @ts-expect-error Next.js Request shape compatible
      const res = await GET(request, ctx)
      expect(res.status).toBe(200)
      expect(((await res.json()) as ExistsResp).exists).toBe(false)
    })

    it('returns { exists: false } when last-generate.json is malformed JSON', async () => {
      const dir = await ensureClipDir('demo-session')
      await fs.writeFile(path.join(dir, '.meta', 'last-generate.json'), '{not json', 'utf8')
      const { request, ctx } = makeReq('demo-session')
      // @ts-expect-error Next.js Request shape compatible
      const res = await GET(request, ctx)
      expect(res.status).toBe(200)
      expect(((await res.json()) as ExistsResp).exists).toBe(false)
    })

    it('returns { exists: false } when latest take recorded an error', async () => {
      await writeRecord('demo-session', {
        generatedAt: '2026-05-23T10:00:00.000Z',
        codeLength: 0,
        llm: { provider: 'openai', model: 'gpt-5.5' },
        errorCode: 'VALIDATION_NO_CODE_BLOCK',
      })
      const { request, ctx } = makeReq('demo-session')
      // @ts-expect-error Next.js Request shape compatible
      const res = await GET(request, ctx)
      expect(res.status).toBe(200)
      expect(((await res.json()) as ExistsResp).exists).toBe(false)
    })
  })

  describe('exists: true with meta', () => {
    it('returns meta with generatedAt / codeLength / provider / model on success take', async () => {
      await writeRecord('demo-session', {
        generatedAt: '2026-05-23T10:00:00.000Z',
        codeLength: 1234,
        llm: { provider: 'openai', model: 'gpt-5.5' },
        errorCode: null,
      })
      const { request, ctx } = makeReq('demo-session')
      // @ts-expect-error Next.js Request shape compatible
      const res = await GET(request, ctx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as ExistsResp
      expect(body.exists).toBe(true)
      expect(body.meta).toEqual({
        generatedAt: '2026-05-23T10:00:00.000Z',
        codeLength: 1234,
        provider: 'openai',
        model: 'gpt-5.5',
      })
    })

    it('returns null fields gracefully when record is missing optional fields', async () => {
      // Minimum valid record: only errorCode: null
      await writeRecord('demo-session', { errorCode: null })
      const { request, ctx } = makeReq('demo-session')
      // @ts-expect-error Next.js Request shape compatible
      const res = await GET(request, ctx)
      expect(res.status).toBe(200)
      const body = (await res.json()) as ExistsResp
      expect(body.exists).toBe(true)
      expect(body.meta).toEqual({ generatedAt: null, codeLength: null, provider: null, model: null })
    })
  })

  describe('validation', () => {
    it('returns 400 VALIDATION_INVALID_CLIP_ID on path-escape attempt', async () => {
      const { request, ctx } = makeReq('../etc/passwd')
      // @ts-expect-error Next.js Request shape compatible
      const res = await GET(request, ctx)
      expect(res.status).toBe(400)
      expect(((await res.json()) as ExistsResp).error?.code).toBe('VALIDATION_INVALID_CLIP_ID')
    })
  })

  describe('side-effect free', () => {
    it('does NOT create the clip directory on probe', async () => {
      const { request, ctx } = makeReq('demo-session')
      // @ts-expect-error Next.js Request shape compatible
      await GET(request, ctx)
      const dir = path.join(TMP_ROOT, '.workspace', 'clips', 'demo-session')
      await expect(fs.access(dir)).rejects.toMatchObject({ code: 'ENOENT' })
    })

    it('does NOT write any files when probing existing clip', async () => {
      await writeRecord('demo-session', { errorCode: null })
      const dir = path.join(TMP_ROOT, '.workspace', 'clips', 'demo-session')
      const entriesBefore = await fs.readdir(dir, { recursive: true })
      const { request, ctx } = makeReq('demo-session')
      // @ts-expect-error Next.js Request shape compatible
      await GET(request, ctx)
      const entriesAfter = await fs.readdir(dir, { recursive: true })
      expect(entriesAfter.toSorted()).toEqual(entriesBefore.toSorted())
    })
  })
})
