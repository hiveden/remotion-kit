// lib/server/llm-client.ts
//
// OpenAI-compatible LLM client. Defaults to CPA proxy (localhost:8317/v1)
// for gpt-5.5; override via OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL.
//
// T2 ships the minimum surface (chatCompletion + extractTsxCodeBlock).
// T4 layers on LLMClient interface, MOCK_LLM fixture path, error classification,
// and OpenAI-specific tuning per the AUTH_/QUOTA_/SYSTEM_/VALIDATION_ contract.

import 'server-only'

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

const DEFAULT_MODEL = 'gpt-5.5'
const DEFAULT_BASE_URL = 'http://localhost:8317/v1'
const DEFAULT_API_KEY = 'cpa-local'

let cached: OpenAI | null = null

function getModel(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_MODEL
}

function getClient(): OpenAI {
  if (cached) return cached
  cached = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY ?? DEFAULT_API_KEY,
  })
  return cached
}

export async function chatCompletion(req: ChatRequest): Promise<ChatResponse> {
  const client = getClient()
  const model = getModel()
  const maxTokens = req.maxTokens ?? Number(process.env.OPENAI_MAX_TOKENS ?? 4096)
  const res = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: req.userPrompt },
    ],
  })
  const text = res.choices[0]?.message?.content ?? ''
  return { text, meta: { provider: 'openai', model, usage: res.usage } }
}

export function extractTsxCodeBlock(text: string): string | null {
  const fenced = text.match(/```(?:tsx?|typescript|javascript|jsx)\s*\n([\s\S]*?)\n```/)
  if (fenced && fenced[1]) return fenced[1]
  if (text.includes('import') && text.includes('export default')) {
    return text.trim()
  }
  return null
}
