// app/api/clips/[id]/exists/route.ts
//
// GET /api/clips/[id]/exists
//   response (always 200, except validation errors):
//     { exists: true,  meta: { generatedAt, codeLength, provider, model } }
//     { exists: false }
//
// Lightweight existence probe used by StorageProvider.peekComposition() so a
// client can decide whether to restore from server-side persistence on mount
// without performing any heavy reads.
//
// Semantics:
//   exists = true  ⇔  .meta/last-generate.json present AND record.errorCode === null
//                     (i.e. there is a successful LLM-generated Composition.tsx)
//   exists = false ⇔  no record file, or the latest take recorded an error
//
// This endpoint:
//   - does NOT touch the filesystem outside the clip directory
//   - does NOT trigger ensureSession (no scaffolding, no brief.json create)
//   - does NOT read Composition.tsx (caller asks for full content via existing
//     routes if needed)

import 'server-only'
import type { NextRequest } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { json, sendError } from '@/lib/server/http'
import { assertValidClipId, clipDirPath, InvalidClipIdError } from '@/lib/server/clip-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface PersistedRecord {
  llm?: { provider?: unknown; model?: unknown }
  codeLength?: unknown
  generatedAt?: unknown
  errorCode?: unknown
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  try {
    assertValidClipId(id)
  } catch (e) {
    if (e instanceof InvalidClipIdError) return sendError(400, 'VALIDATION_INVALID_CLIP_ID', e.message)
    throw e
  }

  const recordPath = path.join(clipDirPath(id), '.meta', 'last-generate.json')

  let raw: string
  try {
    raw = await fs.readFile(recordPath, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return json({ exists: false })
    }
    return sendError(500, 'SYSTEM_READ_FAILED', (e as Error).message)
  }

  let record: PersistedRecord
  try {
    record = JSON.parse(raw) as PersistedRecord
  } catch (e) {
    // Malformed record file — treat as "does not exist" so the client can
    // proceed with a fresh session rather than blocking on parse errors.
    return json({ exists: false })
  }

  // A take that recorded an error (empty response / invalid import / syntax
  // failure) is not a successful generation — do not surface it for restore.
  if (record.errorCode !== null && record.errorCode !== undefined) {
    return json({ exists: false })
  }

  const meta = {
    generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : null,
    codeLength: typeof record.codeLength === 'number' ? record.codeLength : null,
    provider: typeof record.llm?.provider === 'string' ? record.llm.provider : null,
    model: typeof record.llm?.model === 'string' ? record.llm.model : null,
  }

  return json({ exists: true, meta })
}
