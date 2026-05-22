import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the LLM client so tests don't depend on fixture file IO timing.
let chatCallCount = 0
let lastSystemPrompt = ''
let lastUserPrompt = ''
let mockBehavior: 'ok' | 'no-code' | 'empty' | 'auth' | 'quota' | 'network' = 'ok'

vi.mock('@/lib/server/llm-client', async () => {
  // Pull in the real LLMError so route's instanceof check matches.
  const actual = await vi.importActual<typeof import('@/lib/server/llm-client')>(
    '@/lib/server/llm-client',
  )
  return {
    ...actual,
    chatCompletion: vi.fn(async ({ systemPrompt, userPrompt }) => {
      chatCallCount++
      lastSystemPrompt = systemPrompt
      lastUserPrompt = userPrompt
      if (mockBehavior === 'auth') {
        throw new actual.LLMError('AUTH_API_KEY_INVALID', 'gateway auth failed')
      }
      if (mockBehavior === 'quota') {
        throw new actual.LLMError('QUOTA_EXCEEDED', 'rate limited', { retryable: true })
      }
      if (mockBehavior === 'network') {
        throw new actual.LLMError('SYSTEM_NETWORK', 'connection failed', { retryable: true })
      }
      if (mockBehavior === 'empty') {
        return { text: '', meta: { provider: 'openai' as const, model: 'gpt-5.5-test' } }
      }
      if (mockBehavior === 'no-code') {
        return { text: 'I cannot help with that.', meta: { provider: 'openai' as const, model: 'gpt-5.5-test' } }
      }
      const text = "```tsx\nimport React from 'react'\nimport { AbsoluteFill } from 'remotion'\nconst Composition: React.FC = () => <AbsoluteFill />\nexport default Composition\n```"
      return {
        text,
        meta: {
          provider: 'openai' as const,
          model: 'gpt-5.5-test',
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        },
      }
    }),
  }
})

const { POST } = await import('@/app/api/llm/raw/route')

interface OkResp {
  ok: true
  text: string
  code: string
  codeLength: number
  provider: string
  model: string
  usage: unknown
  durationMs: number
}

interface ErrResp {
  error: { code: string; message: string; retryable?: boolean }
}

function makeReq(body: unknown): Request {
  return new Request('http://127.0.0.1:3200/api/llm/raw', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  chatCallCount = 0
  lastSystemPrompt = ''
  lastUserPrompt = ''
  mockBehavior = 'ok'
})

describe('POST /api/llm/raw', () => {
  describe('happy path', () => {
    it('returns 200 with text and extracted code block', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'hello world', durationSeconds: 5 }))
      expect(res.status).toBe(200)
      const body = (await res.json()) as OkResp
      expect(body.ok).toBe(true)
      expect(body.text).toContain('```tsx')
      expect(body.code).toContain('export default')
      expect(body.code).not.toContain('```')
      expect(body.codeLength).toBe(body.code.length)
      expect(body.provider).toBe('openai')
      expect(body.model).toBe('gpt-5.5-test')
      expect(typeof body.durationMs).toBe('number')
      expect(chatCallCount).toBe(1)
    })

    it('builds user prompt from scenePrompt + duration + cameraHint + references', async () => {
      const res = await POST(
        // @ts-expect-error Next.js Request shape compatible
        makeReq({
          scenePrompt: 'sunrise over mountains',
          durationSeconds: 10,
          cameraHint: 'wide shot',
          brief: { references: ['kinetic typography'] },
        }),
      )
      expect(res.status).toBe(200)
      expect(lastUserPrompt).toContain('sunrise over mountains')
      expect(lastUserPrompt).toContain('10s @ 30fps = 300 frames')
      expect(lastUserPrompt).toContain('wide shot')
      expect(lastUserPrompt).toContain('kinetic typography')
    })

    it('honors brief.aspectRatio in system prompt dimensions', async () => {
      const res = await POST(
        // @ts-expect-error Next.js Request shape compatible
        makeReq({ scenePrompt: 'x', durationSeconds: 5, brief: { aspectRatio: '16:9' } }),
      )
      expect(res.status).toBe(200)
      expect(lastSystemPrompt).toContain('1920 × 1080')
    })

    it('defaults aspectRatio to 9:16 when brief omitted', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 5 }))
      expect(res.status).toBe(200)
      expect(lastSystemPrompt).toContain('1080 × 1920')
    })

    it('accepts brandRef:null', async () => {
      const res = await POST(
        // @ts-expect-error Next.js Request shape compatible
        makeReq({ scenePrompt: 'x', durationSeconds: 5, brief: { brandRef: null } }),
      )
      expect(res.status).toBe(200)
    })

    it('returns no clipId / generatedAt fields (stateless)', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 5 }))
      const body = (await res.json()) as OkResp & { clipId?: unknown; generatedAt?: unknown }
      expect(body.clipId).toBeUndefined()
      expect(body.generatedAt).toBeUndefined()
    })
  })

  describe('validation errors', () => {
    it('400 on invalid JSON body', async () => {
      const req = new Request('http://127.0.0.1:3200/api/llm/raw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      })
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(req)
      expect(res.status).toBe(400)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_INVALID_JSON')
    })

    it('422 when scenePrompt missing', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ durationSeconds: 5 }))
      expect(res.status).toBe(422)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_INVALID_SCENE_PROMPT')
    })

    it('422 when scenePrompt is whitespace', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: '   ', durationSeconds: 5 }))
      expect(res.status).toBe(422)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_INVALID_SCENE_PROMPT')
    })

    it('422 when durationSeconds invalid', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: -1 }))
      expect(res.status).toBe(422)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_INVALID_DURATION')
    })

    it('422 when durationSeconds exceeds 60', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 61 }))
      expect(res.status).toBe(422)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_DURATION_TOO_LONG')
    })

    it('422 when brief.aspectRatio is invalid enum', async () => {
      const res = await POST(
        // @ts-expect-error Next.js Request shape compatible
        makeReq({ scenePrompt: 'x', durationSeconds: 5, brief: { aspectRatio: '4:3' } }),
      )
      expect(res.status).toBe(422)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_INVALID_BRIEF')
    })

    it('422 when brief.references contains non-string', async () => {
      const res = await POST(
        // @ts-expect-error Next.js Request shape compatible
        makeReq({ scenePrompt: 'x', durationSeconds: 5, brief: { references: ['ok', 42] } }),
      )
      expect(res.status).toBe(422)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_INVALID_BRIEF')
    })

    it('422 when brief is an array (not an object)', async () => {
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 5, brief: [] }))
      expect(res.status).toBe(422)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_INVALID_BRIEF')
    })
  })

  describe('LLM error classification', () => {
    it('maps AUTH_API_KEY_INVALID to 401 with redacted message', async () => {
      mockBehavior = 'auth'
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 5 }))
      expect(res.status).toBe(401)
      const body = (await res.json()) as ErrResp
      expect(body.error.code).toBe('AUTH_API_KEY_INVALID')
      expect(body.error.message).toContain('LLM configuration error')
    })

    it('maps QUOTA_EXCEEDED to 429 with retryable=true', async () => {
      mockBehavior = 'quota'
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 5 }))
      expect(res.status).toBe(429)
      const body = (await res.json()) as ErrResp
      expect(body.error.code).toBe('QUOTA_EXCEEDED')
      expect(body.error.retryable).toBe(true)
    })

    it('maps SYSTEM_NETWORK to 500 with retryable=true', async () => {
      mockBehavior = 'network'
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 5 }))
      expect(res.status).toBe(500)
      const body = (await res.json()) as ErrResp
      expect(body.error.code).toBe('SYSTEM_NETWORK')
      expect(body.error.retryable).toBe(true)
    })

    it('maps empty LLM text to 500 VALIDATION_EMPTY_RESPONSE', async () => {
      mockBehavior = 'empty'
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 5 }))
      expect(res.status).toBe(500)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_EMPTY_RESPONSE')
    })

    it('maps LLM text without code block to 500 VALIDATION_NO_CODE_BLOCK', async () => {
      mockBehavior = 'no-code'
      // @ts-expect-error Next.js Request shape compatible
      const res = await POST(makeReq({ scenePrompt: 'x', durationSeconds: 5 }))
      expect(res.status).toBe(500)
      expect(((await res.json()) as ErrResp).error.code).toBe('VALIDATION_NO_CODE_BLOCK')
    })
  })
})
