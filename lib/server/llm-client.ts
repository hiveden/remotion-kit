// lib/server/llm-client.ts
//
// OpenAI-compatible LLM client. Defaults to CPA proxy (localhost:8317/v1)
// for gpt-5.5; override via OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL.
//
// MOCK_LLM=1 routes chatCompletion through a fixture JSON so tests / E2E
// don't hit the real network. Fixture lives at tests/__fixtures__/llm/_seed.json
// by default, override with MOCK_LLM_FIXTURE.

import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import OpenAI from 'openai'

export type LlmProvider = 'openai'

export interface ChatRequest {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}

export interface ChatResponse {
  text: string
  meta: { provider: LlmProvider; model: string; usage?: unknown }
}

export interface LLMClient {
  chat(req: ChatRequest): Promise<ChatResponse>
}

export class LLMError extends Error {
  code: string
  retryable: boolean
  override cause?: unknown
  constructor(code: string, message: string, opts: { retryable?: boolean; cause?: unknown } = {}) {
    super(message)
    this.name = 'LLMError'
    this.code = code
    this.retryable = opts.retryable ?? false
    if (opts.cause !== undefined) this.cause = opts.cause
  }
}

const DEFAULT_MODEL = 'gpt-5.5'
const DEFAULT_BASE_URL = 'http://localhost:8317/v1'
const DEFAULT_API_KEY = 'cpa-local'
const DEFAULT_FIXTURE_PATH = 'tests/__fixtures__/llm/_seed.json'

function getModel(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_MODEL
}

export class OpenAIClient implements LLMClient {
  private client: OpenAI
  constructor(opts: { baseURL?: string; apiKey?: string } = {}) {
    this.client = new OpenAI({
      baseURL: opts.baseURL ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL,
      apiKey: opts.apiKey ?? process.env.OPENAI_API_KEY ?? DEFAULT_API_KEY,
    })
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const model = getModel()
    const maxTokens = req.maxTokens ?? Number(process.env.OPENAI_MAX_TOKENS ?? 4096)
    try {
      const res = await this.client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
      })
      const text = res.choices[0]?.message?.content ?? ''
      return { text, meta: { provider: 'openai', model, usage: res.usage } }
    } catch (e) {
      throw classifyOpenAIError(e, model)
    }
  }
}

interface FixtureEntry {
  id: string
  match?: { scenePromptIncludes?: string }
  response: {
    text: string
    meta?: { provider?: LlmProvider; model?: string; usage?: unknown }
  }
}

interface FixtureFile {
  entries: FixtureEntry[]
  default?: FixtureEntry
}

export class FixtureLLMClient implements LLMClient {
  constructor(private fixturePath: string) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    let raw: string
    try {
      raw = await fs.readFile(this.fixturePath, 'utf8')
    } catch (e) {
      throw new LLMError(
        'SYSTEM_FIXTURE_MISSING',
        `LLM fixture file not found at ${this.fixturePath}. Run a real prompt once to seed it, or unset MOCK_LLM.`,
        { cause: e },
      )
    }
    let file: FixtureFile
    try {
      file = JSON.parse(raw) as FixtureFile
    } catch (e) {
      throw new LLMError('SYSTEM_FIXTURE_INVALID', `LLM fixture JSON parse failed: ${(e as Error).message}`, { cause: e })
    }

    const hit = (file.entries ?? []).find((entry) => {
      const needle = entry.match?.scenePromptIncludes
      if (!needle) return false
      return req.userPrompt.includes(needle)
    })
    const chosen = hit ?? file.default
    if (!chosen) {
      throw new LLMError(
        'SYSTEM_FIXTURE_NO_MATCH',
        `No fixture entry matched userPrompt and no default provided in ${this.fixturePath}`,
      )
    }
    return {
      text: chosen.response.text,
      meta: {
        provider: chosen.response.meta?.provider ?? 'openai',
        model: chosen.response.meta?.model ?? getModel(),
        usage: chosen.response.meta?.usage,
      },
    }
  }
}

let cachedClient: LLMClient | null = null

export function createLLMClient(): LLMClient {
  if (process.env.MOCK_LLM === '1') {
    const fixturePath = path.resolve(process.cwd(), process.env.MOCK_LLM_FIXTURE ?? DEFAULT_FIXTURE_PATH)
    return new FixtureLLMClient(fixturePath)
  }
  return new OpenAIClient()
}

/**
 * Reset the module-level cached client. Useful in tests that flip MOCK_LLM /
 * OPENAI_BASE_URL between cases.
 */
export function resetLLMClientCache(): void {
  cachedClient = null
}

/**
 * Backwards-compatible entry point used by clip-generate.ts. Lazily builds
 * the client on first call so env vars set during test bootstrap are honored.
 */
export async function chatCompletion(req: ChatRequest): Promise<ChatResponse> {
  if (!cachedClient) cachedClient = createLLMClient()
  return cachedClient.chat(req)
}

export function extractTsxCodeBlock(text: string): string | null {
  const fenced = text.match(/```(?:tsx?|typescript|javascript|jsx)\s*\n([\s\S]*?)\n```/)
  if (fenced && fenced[1]) return fenced[1]
  if (text.includes('import') && text.includes('export default')) {
    return text.trim()
  }
  return null
}

// ---------------------------------------------------------------------------
// OpenAI SDK error → LLMError mapping.
// SDK 5.x throws subclasses of APIError; status + code drive the bucket.
// ---------------------------------------------------------------------------

function classifyOpenAIError(err: unknown, model: string): LLMError {
  if (err instanceof OpenAI.AuthenticationError) {
    return new LLMError('AUTH_API_KEY_INVALID', 'LLM authentication failed — check OPENAI_API_KEY / gateway config.')
  }
  if (err instanceof OpenAI.PermissionDeniedError) {
    return new LLMError('AUTH_FORBIDDEN', 'LLM rejected the request (permission denied).')
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new LLMError('QUOTA_EXCEEDED', 'LLM rate limit or quota exceeded.', { retryable: true })
  }
  if (err instanceof OpenAI.BadRequestError) {
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('content') && (msg.includes('filter') || msg.includes('policy'))) {
      return new LLMError('VALIDATION_CONTENT_FILTERED', 'LLM refused the prompt (content policy).')
    }
    if (msg.includes('max_tokens') || msg.includes('context length')) {
      return new LLMError('VALIDATION_MAX_TOKENS_EXCEEDED', 'Prompt or max_tokens exceeds the model context window.')
    }
    if (msg.includes('model') && (msg.includes('not found') || msg.includes('does not exist'))) {
      return new LLMError('SYSTEM_MODEL_NOT_FOUND', `Model ${model} not available on the configured endpoint.`)
    }
    return new LLMError('VALIDATION_BAD_REQUEST', err.message)
  }
  if (err instanceof OpenAI.NotFoundError) {
    return new LLMError('SYSTEM_MODEL_NOT_FOUND', `Model ${model} not found on the configured endpoint.`)
  }
  if (err instanceof OpenAI.APIConnectionError || err instanceof OpenAI.APIConnectionTimeoutError) {
    return new LLMError('SYSTEM_NETWORK', 'LLM gateway unreachable or timed out.', { retryable: true, cause: err })
  }
  if (err instanceof OpenAI.InternalServerError) {
    return new LLMError('SYSTEM_UNKNOWN', 'LLM gateway returned a 5xx error.', { retryable: true })
  }
  if (err instanceof OpenAI.APIError) {
    return new LLMError('SYSTEM_UNKNOWN', `LLM API error (${err.status}): ${err.message}`)
  }
  const message = err instanceof Error ? err.message : String(err)
  return new LLMError('SYSTEM_UNKNOWN', message, { cause: err })
}
