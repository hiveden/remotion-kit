// packages/video-gui/app/api/clips/[id]/takes/route.ts
//
// GET /api/clips/[id]/takes
//   response: { activeVersion: string | null, takes: TakeSummary[] }
//
// TakeSummary 来自 takes/meta.json，无文件时返 { activeVersion: null, takes: [] }。

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

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  try {
    assertValidClipId(id)
  } catch (e) {
    if (e instanceof InvalidClipIdError) return sendError(400, 'invalid-id', e.message)
    throw e
  }
  const metaPath = path.join(clipDirPath(id), '.meta', 'takes', 'meta.json')
  try {
    const buf = await fs.readFile(metaPath, 'utf8')
    const meta = JSON.parse(buf) as { activeVersion: string; takes: unknown[] }
    return json({ activeVersion: meta.activeVersion, takes: meta.takes })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return json({ activeVersion: null, takes: [] })
    }
    return sendError(500, 'read-failed', (e as Error).message)
  }
}
