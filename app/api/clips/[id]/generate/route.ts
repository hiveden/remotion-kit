// packages/video-gui/app/api/clips/[id]/generate/route.ts
//
// POST /api/clips/[id]/generate
//   body: { scenePrompt: string; durationSeconds: number; cameraHint?: string }
//   response: { ok: true, clipId, generatedAt, codeLength } | sendError
//
// SSOT: DESIGN.md §9

import type { NextRequest } from 'next/server'
import { json, sendError } from '@/lib/server/http'
import {
  assertValidClipId,
  InvalidClipIdError,
} from '@/lib/server/clip-store'
import { generateClipComposition } from '@/lib/server/clip-generate'

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
    if (e instanceof InvalidClipIdError) return sendError(400, 'invalid-id', e.message)
    throw e
  }
  let body: Body
  try {
    body = await req.json()
  } catch {
    return sendError(400, 'invalid-json', 'request body is not valid JSON')
  }
  if (typeof body.scenePrompt !== 'string' || !body.scenePrompt.trim()) {
    return sendError(422, 'invalid-scenePrompt', 'scenePrompt must be non-empty string')
  }
  if (typeof body.durationSeconds !== 'number' || !Number.isFinite(body.durationSeconds) || body.durationSeconds <= 0) {
    return sendError(422, 'invalid-duration', 'durationSeconds must be positive number')
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
    // 结构化错误：根据 message 启发式分类，避免直接把 Anthropic SDK 的 stack /
    // baseURL 等内部信息暴露到 client。前端可针对 code 做不同 toast。
    const msg = (e as Error).message ?? 'unknown error'
    const lower = msg.toLowerCase()
    const code = lower.includes('apikey') || lower.includes('authentication') || lower.includes('authorization')
      ? 'auth-failed'
      : lower.includes('不允许的 import') || lower.includes('invalid-import')
      ? 'invalid-import'
      : lower.includes('parse') || lower.includes('extract')
      ? 'parse-failed'
      : lower.includes('write') || lower.includes('enoent') || lower.includes('eacces')
      ? 'write-failed'
      : 'generate-failed'
    // 安全 message：auth-failed 完全脱敏；其他类型仅给短描述
    const safeMessage =
      code === 'auth-failed'
        ? 'LLM gateway 认证失败 — 请检查 ANTHROPIC_API_KEY / 网关配置'
        : code === 'invalid-import'
        ? msg // invalid-import 已经在 clip-generate 里 sanitize 过，直接传
        : code === 'parse-failed'
        ? 'LLM 返回内容无法解析为可用 tsx 代码块'
        : code === 'write-failed'
        ? '写入 Composition.tsx 失败'
        : 'generate failed'
    return sendError(500, code, safeMessage)
  }
}
