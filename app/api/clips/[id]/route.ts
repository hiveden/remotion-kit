// packages/video-gui/app/api/clips/[id]/route.ts
//
// GET    /api/clips/[id]
// PUT    /api/clips/[id]  body: Partial<{ name, brandRef, aspectRatio, resolution,
//                                          publishPlatform, captionStyle, targetDuration,
//                                          references, note, status }>
// DELETE /api/clips/[id]
//
// SSOT: DESIGN.md §3 / §8

import type { NextRequest } from 'next/server'
import { json, sendError } from '@/lib/server/http'
import {
  readBrief,
  writeBrief,
  deleteClip,
  ClipNotFoundError,
  ClipValidationError,
  InvalidClipIdError,
  assertValidClipId,
} from '@/lib/server/clip-store'
import { syncReferences } from '@/lib/server/clip-references'
import { ensureScaffoldFresh, scaffoldClipDir } from '@/lib/server/clip-bootstrap'
import {
  validateClipBrief,
  ASPECT_RATIOS,
  RESOLUTIONS,
  PUBLISH_PLATFORMS,
  CAPTION_STYLES,
  STATUSES,
  type ClipBrief,
} from '@/lib/editor/clip-instance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function getValidId(ctx: RouteContext): Promise<{ id: string } | Response> {
  const { id } = await ctx.params
  try {
    assertValidClipId(id)
    return { id }
  } catch (e) {
    if (e instanceof InvalidClipIdError) return sendError(400, 'VALIDATION_INVALID_CLIP_ID', e.message)
    throw e
  }
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const idOrResp = await getValidId(ctx)
  if (idOrResp instanceof Response) return idOrResp
  const clip = await readBrief(idOrResp.id)
  if (!clip) return sendError(404, 'NOT_FOUND', `clip not found: ${idOrResp.id}`)
  // 兜底：用户手动 rm src/ 或新版 placeholder 升级时，GET 时自愈
  await scaffoldClipDir(clip)
  return json({ clip })
}

interface UpdateBody {
  name?: unknown
  brandRef?: unknown
  aspectRatio?: unknown
  resolution?: unknown
  publishPlatform?: unknown
  captionStyle?: unknown
  targetDuration?: unknown
  references?: unknown
  note?: unknown
  status?: unknown
}

function inEnum<T extends readonly string[]>(arr: T, v: unknown): v is T[number] {
  return typeof v === 'string' && (arr as readonly string[]).includes(v)
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const idOrResp = await getValidId(ctx)
  if (idOrResp instanceof Response) return idOrResp
  const { id } = idOrResp

  let body: UpdateBody
  try {
    body = await req.json()
  } catch {
    return sendError(400, 'VALIDATION_INVALID_JSON', 'request body is not valid JSON')
  }

  const existing = await readBrief(id)
  if (!existing) return sendError(404, 'NOT_FOUND', `clip not found: ${id}`)

  const next: ClipBrief = { ...existing }
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return sendError(422, 'VALIDATION_INVALID_NAME', 'name must be non-empty')
    next.name = body.name
  }
  if (body.brandRef !== undefined) {
    if (body.brandRef !== null && typeof body.brandRef !== 'string') return sendError(422, 'VALIDATION_INVALID_BRAND_REF', 'brandRef must be string|null')
    next.brandRef = body.brandRef
  }
  if (body.aspectRatio !== undefined) {
    if (!inEnum(ASPECT_RATIOS, body.aspectRatio)) return sendError(422, 'VALIDATION_INVALID_ASPECT_RATIO', `must be one of ${ASPECT_RATIOS.join('|')}`)
    next.aspectRatio = body.aspectRatio
  }
  if (body.resolution !== undefined) {
    if (!inEnum(RESOLUTIONS, body.resolution)) return sendError(422, 'VALIDATION_INVALID_RESOLUTION', `must be one of ${RESOLUTIONS.join('|')}`)
    next.resolution = body.resolution
  }
  if (body.publishPlatform !== undefined) {
    if (!inEnum(PUBLISH_PLATFORMS, body.publishPlatform)) return sendError(422, 'VALIDATION_INVALID_PUBLISH_PLATFORM', `must be one of ${PUBLISH_PLATFORMS.join('|')}`)
    next.publishPlatform = body.publishPlatform
  }
  if (body.captionStyle !== undefined) {
    if (!inEnum(CAPTION_STYLES, body.captionStyle)) return sendError(422, 'VALIDATION_INVALID_CAPTION_STYLE', `must be one of ${CAPTION_STYLES.join('|')}`)
    next.captionStyle = body.captionStyle
  }
  if (body.targetDuration !== undefined) {
    if (typeof body.targetDuration !== 'number' || !Number.isFinite(body.targetDuration) || body.targetDuration <= 0) {
      return sendError(422, 'VALIDATION_INVALID_TARGET_DURATION', 'must be positive number')
    }
    next.targetDuration = body.targetDuration
  }
  if (body.note !== undefined) {
    if (typeof body.note !== 'string') return sendError(422, 'VALIDATION_INVALID_NOTE', 'note must be string')
    next.note = body.note
  }
  if (body.status !== undefined) {
    if (!inEnum(STATUSES, body.status)) return sendError(422, 'VALIDATION_INVALID_STATUS', `must be one of ${STATUSES.join('|')}`)
    next.status = body.status
  }
  if (body.references !== undefined) {
    // 由 validateClipBrief 严格校验形状
    next.references = body.references as ClipBrief['references']
  }
  next.updatedAt = new Date().toISOString()

  const check = validateClipBrief(next)
  if (!check.ok) return sendError(422, 'VALIDATION_FAILED', check.errors.join('; '))

  try {
    await writeBrief(check.value)
    await syncReferences(check.value.id, check.value.references)
    // brand / aspect / duration 等改变 → 同步刷新 placeholder（cc 已改写则 no-op）
    await ensureScaffoldFresh(check.value)
  } catch (e) {
    if (e instanceof ClipValidationError) return sendError(422, 'VALIDATION_FAILED', e.errors.join('; '))
    throw e
  }
  return json({ clip: check.value })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const idOrResp = await getValidId(ctx)
  if (idOrResp instanceof Response) return idOrResp
  try {
    await deleteClip(idOrResp.id)
  } catch (e) {
    if (e instanceof ClipNotFoundError) return sendError(404, 'NOT_FOUND', e.message)
    throw e
  }
  return new Response(null, { status: 204 })
}
