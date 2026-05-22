// packages/video-gui/app/api/clips/[id]/status/route.ts
//
// GET /api/clips/[id]/status
//   response: { isScaffold: boolean; mtime?: string; lastError?: string }
//
// Used by ProduceTab to color scene timeline rows (○ empty / ✓ done / ⚠ failed).
// 'isScaffold': boolean — Composition.tsx 仍含 SCAFFOLD_MARKER 则为 true (即 'empty')
// 缺 lastError 字段：失败状态由 client 缓存（generateScene catch block）；
// 服务端不持久化 failed。

import 'server-only'
import type { NextRequest } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { json, sendError } from '@/lib/server/http'
import { assertValidClipId, clipDirPath, InvalidClipIdError } from '@/lib/server/clip-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCAFFOLD_MARKER = '// <SCAFFOLDED PLACEHOLDER — safe to overwrite>'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  try {
    assertValidClipId(id)
  } catch (e) {
    if (e instanceof InvalidClipIdError) return sendError(400, 'VALIDATION_INVALID_CLIP_ID', e.message)
    throw e
  }
  const compPath = path.join(clipDirPath(id), 'src', 'Composition.tsx')
  try {
    const [content, stat] = await Promise.all([
      fs.readFile(compPath, 'utf8'),
      fs.stat(compPath),
    ])
    const isScaffold = content.includes(SCAFFOLD_MARKER)
    return json({ isScaffold, mtime: stat.mtime.toISOString() })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return sendError(404, 'NOT_FOUND', `Clip ${id} not found or Composition.tsx missing.`)
    }
    return sendError(500, 'SYSTEM_READ_FAILED', (e as Error).message)
  }
}
