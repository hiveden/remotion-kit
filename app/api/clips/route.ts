// packages/video-gui/app/api/clips/route.ts
//
// GET  /api/clips?include=archived  → list
// POST /api/clips                   → create (body: { name })
//
// SSOT: DESIGN.md §4 / §8

import type { NextRequest } from 'next/server'
import { json, sendError } from '@/lib/server/http'
import {
  listBriefs,
  writeBrief,
  ClipConflictError,
  ClipValidationError,
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
}

export async function POST(req: NextRequest) {
  let body: CreateBody
  try {
    body = await req.json()
  } catch {
    return sendError(400, 'invalid-json', 'request body is not valid JSON')
  }
  const rawName = typeof body.name === 'string' ? body.name.trim() : ''
  const name = rawName || 'Untitled clip'

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
      return sendError(409, 'id-conflict', `clip id already exists: ${id}`)
    }
    if (e instanceof ClipValidationError) {
      return sendError(422, 'validation-failed', e.errors.join('; '))
    }
    throw e
  }
  return json({ clip: brief }, 201)
}
