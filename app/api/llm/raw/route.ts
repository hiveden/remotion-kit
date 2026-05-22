// app/api/llm/raw/route.ts
//
// POST /api/llm/raw
//   body: { scenePrompt, durationSeconds, cameraHint?, brief? }
//   response:
//     200 { ok: true, text, codeLength, model, provider, usage, durationMs }
//     422 { error: { code: 'VALIDATION_*', message } }
//     401 { error: { code: 'AUTH_*', message, retryable? } }
//     429 { error: { code: 'QUOTA_EXCEEDED', message, retryable: true } }
//     500 { error: { code: 'SYSTEM_*', message, retryable? } }
//
// Stateless LLM bridge: takes a prompt, returns the assistant text.
// Used by the ClientIndexedDBProvider (T22 Phase 3) — the client persists
// the generated Composition.tsx itself, so this endpoint deliberately does
// not touch the filesystem.

import type { NextRequest } from 'next/server'
import { json, sendError } from '@/lib/server/http'
import { chatCompletion, extractTsxCodeBlock, LLMError } from '@/lib/server/llm-client'
import {
  buildSystemPrompt,
  buildUserPrompt,
  DEFAULT_PROMPT_BRIEF,
  type PromptBrief,
} from '@/lib/server/llm-prompts'
import {
  ASPECT_RATIOS,
  PUBLISH_PLATFORMS,
  CAPTION_STYLES,
  MAX_DURATION_SECONDS,
} from '@/lib/editor/clip-instance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  scenePrompt?: unknown
  durationSeconds?: unknown
  cameraHint?: unknown
  brief?: unknown
}

interface BriefSlice {
  aspectRatio?: unknown
  publishPlatform?: unknown
  captionStyle?: unknown
  brandRef?: unknown
  references?: unknown
}

function inEnum<T extends readonly string[]>(arr: T, v: unknown): v is T[number] {
  return typeof v === 'string' && (arr as readonly string[]).includes(v)
}

function parseBriefSlice(raw: unknown): { ok: true; value: PromptBrief } | { ok: false; field: string } {
  const merged: PromptBrief = { ...DEFAULT_PROMPT_BRIEF }
  if (raw === undefined || raw === null) return { ok: true, value: merged }
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, field: 'brief' }
  const r = raw as BriefSlice
  if (r.aspectRatio !== undefined) {
    if (!inEnum(ASPECT_RATIOS, r.aspectRatio)) return { ok: false, field: 'brief.aspectRatio' }
    merged.aspectRatio = r.aspectRatio
  }
  if (r.publishPlatform !== undefined) {
    if (!inEnum(PUBLISH_PLATFORMS, r.publishPlatform)) return { ok: false, field: 'brief.publishPlatform' }
    merged.publishPlatform = r.publishPlatform
  }
  if (r.captionStyle !== undefined) {
    if (!inEnum(CAPTION_STYLES, r.captionStyle)) return { ok: false, field: 'brief.captionStyle' }
    merged.captionStyle = r.captionStyle
  }
  if (r.brandRef !== undefined) {
    if (r.brandRef !== null && typeof r.brandRef !== 'string') return { ok: false, field: 'brief.brandRef' }
    merged.brandRef = r.brandRef as string | null
  }
  if (r.references !== undefined) {
    if (!Array.isArray(r.references)) return { ok: false, field: 'brief.references' }
    const refs: string[] = []
    for (const item of r.references) {
      if (typeof item !== 'string') return { ok: false, field: 'brief.references' }
      const trimmed = item.trim()
      if (trimmed) refs.push(trimmed)
    }
    merged.references = refs
  }
  return { ok: true, value: merged }
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return sendError(400, 'VALIDATION_INVALID_JSON', 'Request body is not valid JSON.')
  }

  if (typeof body.scenePrompt !== 'string' || !body.scenePrompt.trim()) {
    return sendError(422, 'VALIDATION_INVALID_SCENE_PROMPT', 'scenePrompt must be a non-empty string.')
  }
  if (typeof body.durationSeconds !== 'number' || !Number.isFinite(body.durationSeconds) || body.durationSeconds <= 0) {
    return sendError(422, 'VALIDATION_INVALID_DURATION', 'durationSeconds must be a positive number.')
  }
  if (body.durationSeconds > MAX_DURATION_SECONDS) {
    return sendError(422, 'VALIDATION_DURATION_TOO_LONG', `durationSeconds must be <= ${MAX_DURATION_SECONDS}s.`)
  }
  const cameraHint = typeof body.cameraHint === 'string' ? body.cameraHint : undefined

  const parsed = parseBriefSlice(body.brief)
  if (!parsed.ok) {
    return sendError(422, 'VALIDATION_INVALID_BRIEF', `Invalid ${parsed.field} in brief.`)
  }
  const brief = parsed.value

  const systemPrompt = buildSystemPrompt(brief)
  const userPrompt = buildUserPrompt(
    { scenePrompt: body.scenePrompt, durationSeconds: body.durationSeconds, cameraHint },
    brief,
  )

  const startedAt = Date.now()
  let text: string
  let meta: { provider: string; model: string; usage?: unknown }
  try {
    const res = await chatCompletion({ systemPrompt, userPrompt, maxTokens: 8000 })
    text = res.text
    meta = res.meta
  } catch (e) {
    if (e instanceof LLMError) {
      const safeMessage = e.code.startsWith('AUTH_')
        ? 'LLM configuration error — check OPENAI_API_KEY / gateway config.'
        : e.message
      return sendError(errorStatusFor(e.code), e.code, safeMessage, { retryable: e.retryable })
    }
    return sendError(500, 'SYSTEM_UNKNOWN', 'Unexpected LLM error.')
  }
  const durationMs = Date.now() - startedAt

  if (!text) {
    return sendError(500, 'VALIDATION_EMPTY_RESPONSE', 'LLM returned an empty response.')
  }
  const code = extractTsxCodeBlock(text)
  if (!code) {
    return sendError(500, 'VALIDATION_NO_CODE_BLOCK', 'LLM response did not contain a parsable tsx code block.', {
      // include rawResponse so the client can choose to surface or log it
      // (kept under message field to stay inside the existing Error envelope)
    })
  }

  return json({
    ok: true,
    text,
    code,
    codeLength: code.length,
    provider: meta.provider,
    model: meta.model,
    usage: meta.usage ?? null,
    durationMs,
  })
}

function errorStatusFor(code: string): number {
  if (code.startsWith('AUTH_')) return 401
  if (code.startsWith('QUOTA_')) return 429
  if (code.startsWith('VALIDATION_')) return 422
  return 500
}
