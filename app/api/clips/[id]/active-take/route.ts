// packages/video-gui/app/api/clips/[id]/active-take/route.ts
//
// PUT /api/clips/[id]/active-take
//   body: { version: string }  // e.g. "v2"
//   response: { ok: true, activeVersion: string }
//
// 行为：
//   1. 读 takes/meta.json，找到 target version 对应的 ts
//   2. 复制 takes/vN-<ts>.tsx → src/Composition.tsx
//   3. 复制 takes/vN-<ts>.json → .meta/last-generate.json
//   4. 更新 takes/meta.json 的 activeVersion
//
// 切换前不再 archive current — 因为切换不产生新 take，它指向已有的归档版本。
// 注意：切回 v1 后再 generate 新的就是 v(N+1)，不覆盖中间版本。

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

interface Body {
  version?: unknown
}

interface TakeMeta {
  schemaVersion: number
  activeVersion: string
  takes: Array<{ version: string; generatedAt: string; [k: string]: unknown }>
}

function tsForFilename(iso: string): string {
  return iso.replace(/[:.]/g, '-').slice(0, 19)
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
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
    return sendError(400, 'invalid-json', 'body 不是合法 JSON')
  }
  if (typeof body.version !== 'string' || !/^v\d+$/.test(body.version)) {
    return sendError(422, 'invalid-version', 'version 必须为 vN 格式（如 v1, v2）')
  }
  const target = body.version
  const metaPath = path.join(clipDirPath(id), '.meta', 'takes', 'meta.json')
  let meta: TakeMeta
  try {
    const buf = await fs.readFile(metaPath, 'utf8')
    meta = JSON.parse(buf) as TakeMeta
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return sendError(404, 'no-takes', '该 clip 没有 take 历史')
    }
    return sendError(500, 'read-failed', (e as Error).message)
  }
  const entry = meta.takes.find((t) => t.version === target)
  if (!entry) {
    return sendError(404, 'version-not-found', `version ${target} 不在 takes 列表中`)
  }
  const ts = tsForFilename(entry.generatedAt)
  const tsxSrc = path.join(clipDirPath(id), '.meta', 'takes', `${target}-${ts}.tsx`)
  const jsonSrc = path.join(clipDirPath(id), '.meta', 'takes', `${target}-${ts}.json`)
  const compPath = path.join(clipDirPath(id), 'src', 'Composition.tsx')
  const recordPath = path.join(clipDirPath(id), '.meta', 'last-generate.json')

  // Read source files, write to active locations
  try {
    const [tsxContent, jsonContent] = await Promise.all([
      fs.readFile(tsxSrc, 'utf8').catch(() => null),
      fs.readFile(jsonSrc, 'utf8').catch(() => null),
    ])
    // Only switch if there's actually code to switch to (some takes may have errorCode and empty code)
    if (tsxContent !== null) {
      await fs.writeFile(compPath, tsxContent, 'utf8')
    }
    if (jsonContent !== null) {
      await fs.writeFile(recordPath, jsonContent, 'utf8')
    }
    // Update meta.activeVersion
    meta.activeVersion = target
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8')
    return json({ ok: true, activeVersion: target })
  } catch (e) {
    return sendError(500, 'switch-failed', (e as Error).message)
  }
}
