// app/api/clips/[id]/generate/route.ts
//
// POST /api/clips/[id]/generate
//   body: { scenePrompt: string; durationSeconds: number; cameraHint?: string }
//   response: { ok: true, clipId, generatedAt, codeLength } | { error: { code, message, retryable? } }
//
// Error codes follow the AUTH_/QUOTA_/SYSTEM_/VALIDATION_ contract.
// See docs/api/openapi.yaml for the full enumeration.

import type { NextRequest } from 'next/server'
import { json, sendError } from '@/lib/server/http'
import {
  assertValidClipId,
  ClipNotFoundError,
  InvalidClipIdError,
} from '@/lib/server/clip-store'
import { generateClipComposition } from '@/lib/server/clip-generate'
import { LLMError } from '@/lib/server/llm-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface Body {
  scenePrompt?: unknown
  durationSeconds?: unknown
  cameraHint?: unknown
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  try {
    assertValidClipId(id)
  } catch (e) {
    if (e instanceof InvalidClipIdError) return sendError(400, 'VALIDATION_INVALID_CLIP_ID', e.message)
    throw e
  }
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
  const cameraHint = typeof body.cameraHint === 'string' ? body.cameraHint : undefined

  try {
    const result = await generateClipComposition({
      clipId: id,
      scenePrompt: body.scenePrompt,
      durationSeconds: body.durationSeconds,
      cameraHint,
    })
    return json(result)
  } catch (e) {
    if (e instanceof ClipNotFoundError) {
      return sendError(404, 'NOT_FOUND', e.message)
    }
    if (e instanceof LLMError) {
      // AUTH_* messages are scrubbed at the boundary — Frontend redacts them
      // anyway, but never leak gateway internals to the client.
      const safeMessage = e.code.startsWith('AUTH_')
        ? 'LLM configuration error — check OPENAI_API_KEY / gateway config.'
        : e.message
      const status = errorStatusFor(e.code)
      return sendError(status, e.code, safeMessage, { retryable: e.retryable })
    }
    const err = e as NodeJS.ErrnoException
    if (err && (err.code === 'ENOENT' || err.code === 'EACCES')) {
      return sendError(500, 'SYSTEM_WRITE_FAILED', 'Failed to write Composition.tsx to disk.')
    }
    return sendError(500, 'SYSTEM_UNKNOWN', 'Unexpected error while generating composition.')
  }
}

function errorStatusFor(code: string): number {
  if (code.startsWith('AUTH_')) return 401
  if (code.startsWith('QUOTA_')) return 429
  if (code.startsWith('VALIDATION_')) return 422
  if (code === 'NOT_FOUND') return 404
  return 500
}
