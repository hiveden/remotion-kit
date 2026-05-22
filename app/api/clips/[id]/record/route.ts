// packages/video-gui/app/api/clips/[id]/record/route.ts
//
// GET /api/clips/[id]/record
//   response:
//     200 { source: 'persisted', record: GenerateRecord }      ← .meta/last-generate.json 存在
//     200 { source: 'best-effort', record: PartialRecord }     ← Composition.tsx 存在但无 record (旧 generate 未持久)
//     200 { source: 'none' }                                    ← scaffold/empty/missing
//
// 让 UI 能区分"完整记录" / "降级填充" / "无数据" 三态。

import 'server-only'
import type { NextRequest } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { json, sendError } from '@/lib/server/http'
import { assertValidClipId, clipDirPath, readBrief, InvalidClipIdError } from '@/lib/server/clip-store'

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
    if (e instanceof InvalidClipIdError) return sendError(400, 'invalid-id', e.message)
    throw e
  }
  const dir = clipDirPath(id)
  const recordPath = path.join(dir, '.meta', 'last-generate.json')
  const compPath = path.join(dir, 'src', 'Composition.tsx')

  // 1. 优先 persisted record
  try {
    const buf = await fs.readFile(recordPath, 'utf8')
    const record = JSON.parse(buf) as unknown
    let code: string | null = null
    try {
      code = await fs.readFile(compPath, 'utf8')
    } catch {
      // composition missing despite persisted record — leave code null
    }
    return json({ source: 'persisted', record, code })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      return sendError(500, 'read-failed', (e as Error).message)
    }
  }

  // 2. Composition.tsx 存在且非 scaffold → best-effort 降级
  try {
    const [code, stat, brief] = await Promise.all([
      fs.readFile(compPath, 'utf8'),
      fs.stat(compPath),
      readBrief(id),
    ])
    if (code.includes(SCAFFOLD_MARKER)) {
      return json({ source: 'none', reason: 'scaffold-placeholder' })
    }
    return json({
      source: 'best-effort',
      code,
      record: {
        clipId: id,
        clipName: brief?.name ?? id,
        scenePrompt: null, // 未持久（在 ProduceTab 调用时才传，未存）
        durationSeconds: brief?.targetDuration ?? null,
        composition: {
          aspectRatio: brief?.aspectRatio ?? null,
          resolution: brief?.resolution ?? null,
          publishPlatform: brief?.publishPlatform ?? null,
          captionStyle: brief?.captionStyle ?? null,
        },
        codeLength: code.length,
        generatedAt: stat.mtime.toISOString(),
        notice:
          '此 clip 在持久化机制前生成，仅有最终代码 + 文件 mtime。重新生成可获完整记录。',
      },
    })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return json({ source: 'none', reason: 'no-composition' })
    }
    return sendError(500, 'read-failed', (e as Error).message)
  }
}
