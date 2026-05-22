// app/api/clips/route.ts
//
// GET  /api/clips?include=archived  → list
// POST /api/clips                   → create
//   body: { name?: string; id?: string }
//
// If body.id is provided:
//   - id must match the clip-id regex (defense-in-depth path validation)
//   - if a clip with this id already exists → 200 { clip } (idempotent ensure;
//     does not touch existing brief.json on disk)
//   - if it does not exist → create with the provided id (201)
//
// If body.id is not provided:
//   - generate a new id from name → 201 { clip } (original behavior)
//
// The id form is used by v0.2 demo to pin a `demo-session` clip so reloading
// the page does not accumulate session clips on disk.

import type { NextRequest } from 'next/server'
import { json, sendError } from '@/lib/server/http'
import {
  listBriefs,
  readBrief,
  writeBrief,
  assertValidClipId,
  ClipConflictError,
  ClipValidationError,
  InvalidClipIdError,
} from '@/lib/server/clip-store'
import { scaffoldClipDir } from '@/lib/server/clip-bootstrap'
import {
  generateClipId,
  DEFAULT_BRIEF,
  type ClipBrief,
} from '@/lib/editor/clip-instance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const includeRaw = req.nextUrl.searchParams.get('include')
  const includeArchived = includeRaw === 'archived' || includeRaw === 'all'
  const clips = await listBriefs({ includeArchived })
  return json({ clips })
}

interface CreateBody {
  name?: unknown
  id?: unknown
}

export async function POST(req: NextRequest) {
  let body: CreateBody
  try {
    body = await req.json()
  } catch {
    return sendError(400, 'VALIDATION_INVALID_JSON', 'Request body is not valid JSON.')
  }

  const rawName = typeof body.name === 'string' ? body.name.trim() : ''
  const name = rawName || 'Untitled clip'

  // Branch 1: explicit id provided — idempotent ensure.
  if (body.id !== undefined) {
    try {
      assertValidClipId(body.id)
    } catch (e) {
      if (e instanceof InvalidClipIdError) {
        return sendError(400, 'VALIDATION_INVALID_CLIP_ID', e.message)
      }
      throw e
    }
    const requestedId = body.id
    const existing = await readBrief(requestedId)
    if (existing) {
      return json({ clip: existing }, 200)
    }
    const now = new Date().toISOString()
    const brief: ClipBrief = {
      ...DEFAULT_BRIEF,
      id: requestedId,
      name,
      createdAt: now,
      updatedAt: now,
    }
    try {
      await writeBrief(brief, { mustNotExist: true })
      await scaffoldClipDir(brief)
    } catch (e) {
      if (e instanceof ClipConflictError) {
        const after = await readBrief(requestedId)
        if (after) return json({ clip: after }, 200)
        return sendError(409, 'CONFLICT_ID', `Clip id already exists: ${requestedId}`)
      }
      if (e instanceof ClipValidationError) {
        return sendError(422, 'VALIDATION_FAILED', e.errors.join('; '))
      }
      throw e
    }
    return json({ clip: brief }, 201)
  }

  // Branch 2: no id — generate a fresh one (original behavior).
  const now = new Date().toISOString()
  const id = generateClipId(name)
  const brief: ClipBrief = {
    ...DEFAULT_BRIEF,
    id,
    name,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await writeBrief(brief, { mustNotExist: true })
    await scaffoldClipDir(brief)
  } catch (e) {
    if (e instanceof ClipConflictError) {
      return sendError(409, 'CONFLICT_ID', `Clip id already exists: ${id}`)
    }
    if (e instanceof ClipValidationError) {
      return sendError(422, 'VALIDATION_FAILED', e.errors.join('; '))
    }
    throw e
  }
  return json({ clip: brief }, 201)
}
