// packages/video-gui/lib/server/clip-store.ts
//
// Clip Brief 目录形态 fs IO 层。
//
// .workspace/clips/<id>/
//   brief.json
//   src/...           (cc 写的代码；writeBrief 不动这里)
//   references/...    (clip-references.ts 维护)
//   .meta/...         (preview bundler 缓存)
//
// SSOT: docs/refactor-plan/explorations/2026-05-18-clip-task-brief/DESIGN.md §2

import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

import { CLIPS_ROOT } from './paths'
import { validateClipBrief, type ClipBrief } from '@/lib/editor/clip-instance'

/**
 * Clip Instance id 形态约束：
 *   - 必须以 ASCII 字母数字开头
 *   - 后续允许 ASCII 字母数字 / -
 *   - 总长度 1..72（slug 32 + '-' + uuid 8 = 41，留余量给未来扩展）
 *
 * 与 lib/editor/clip-instance.ts 的 generateClipId 输出形态一致。
 */
const ID_REGEX = /^[a-z0-9][a-z0-9-]{0,71}$/

export class InvalidClipIdError extends Error {
  constructor(id: unknown) {
    super(`invalid clip id: ${JSON.stringify(id)}（需匹配 ${ID_REGEX.source}）`)
    this.name = 'InvalidClipIdError'
  }
}
export class ClipNotFoundError extends Error {
  constructor(id: string) {
    super(`clip not found: ${id}`)
    this.name = 'ClipNotFoundError'
  }
}
export class ClipConflictError extends Error {
  constructor(id: string) {
    super(`clip already exists: ${id}`)
    this.name = 'ClipConflictError'
  }
}
export class ClipValidationError extends Error {
  errors: string[]
  constructor(errors: string[]) {
    super(`clip validation failed: ${errors.join('; ')}`)
    this.name = 'ClipValidationError'
    this.errors = errors
  }
}

export function assertValidClipId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !ID_REGEX.test(id)) throw new InvalidClipIdError(id)
}

export function clipDirPath(id: string): string {
  assertValidClipId(id)
  const joined = path.resolve(CLIPS_ROOT, id)
  const rootResolved = path.resolve(CLIPS_ROOT)
  if (joined !== rootResolved && !joined.startsWith(rootResolved + path.sep)) {
    throw new Error(`path escape detected: ${joined} not under ${rootResolved}`)
  }
  return joined
}

function briefFilePath(id: string): string {
  return path.join(clipDirPath(id), 'brief.json')
}

async function ensureRoot(): Promise<void> {
  await fs.mkdir(CLIPS_ROOT, { recursive: true })
}

export async function listBriefs(
  opts: { includeArchived?: boolean } = {},
): Promise<ClipBrief[]> {
  await ensureRoot()
  let entries: string[]
  try {
    entries = await fs.readdir(CLIPS_ROOT)
  } catch {
    return []
  }
  const out: ClipBrief[] = []
  for (const entry of entries) {
    const dir = path.join(CLIPS_ROOT, entry)
    let st: import('node:fs').Stats
    try {
      st = await fs.stat(dir)
    } catch {
      continue
    }
    if (!st.isDirectory()) continue
    const briefPath = path.join(dir, 'brief.json')
    let raw: string
    try {
      raw = await fs.readFile(briefPath, 'utf8')
    } catch {
      // 不是 clip 目录或 brief.json 缺失，skip
      continue
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[clip-store] invalid JSON in ${entry}/brief.json:`, (e as Error).message)
      continue
    }
    // Migration: 旧 brief 无 producerKind 字段，自动补默认（保持向下兼容）
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>
      if (obj.producerKind === undefined) {
        obj.producerKind = 'remotion'
      }
    }
    const result = validateClipBrief(parsed)
    if (!result.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[clip-store] validation failed for ${entry}:`, result.errors.join('; '))
      continue
    }
    if (!opts.includeArchived && result.value.status === 'archived') continue
    out.push(result.value)
  }
  out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
  return out
}

export async function readBrief(id: string): Promise<ClipBrief | null> {
  await ensureRoot()
  const filePath = briefFilePath(id)
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
  const parsed = JSON.parse(raw)
  // Migration: 旧 brief 无 producerKind 字段，自动补默认（保持向下兼容）
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>
    if (obj.producerKind === undefined) {
      obj.producerKind = 'remotion'
    }
  }
  const result = validateClipBrief(parsed)
  if (!result.ok) throw new ClipValidationError(result.errors)
  return result.value
}

/**
 * 写 brief.json。
 *  - mustNotExist + 目录已存在 → ClipConflictError（fs.access + fs.mkdir 间有 TOCTOU 窗口，
 *    多 tab 写入按 last-write-wins；本仓不引文件锁，concurrent 写极少出现冲突）
 *  - 否则 mkdir + atomic write brief.json（tmp file → rename，不动 src / references / .meta）
 */
export async function writeBrief(
  brief: ClipBrief,
  opts: { mustNotExist?: boolean } = {},
): Promise<void> {
  const result = validateClipBrief(brief)
  if (!result.ok) throw new ClipValidationError(result.errors)
  await ensureRoot()
  const dir = clipDirPath(brief.id)
  if (opts.mustNotExist) {
    try {
      await fs.access(dir)
      throw new ClipConflictError(brief.id)
    } catch (e) {
      if (e instanceof ClipConflictError) throw e
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
  }
  await fs.mkdir(dir, { recursive: true })
  const filePath = briefFilePath(brief.id)
  const tmpSuffix = randomBytes(6).toString('hex')
  const tmpPath = `${filePath}.${tmpSuffix}.tmp`
  const json = JSON.stringify(result.value, null, 2)
  await fs.writeFile(tmpPath, json, 'utf8')
  await fs.rename(tmpPath, filePath)
}

/**
 * 物理删整个 clip 目录（包含 src / references / .meta）。
 */
export async function deleteClip(id: string): Promise<void> {
  await ensureRoot()
  const dir = clipDirPath(id)
  try {
    await fs.stat(dir)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') throw new ClipNotFoundError(id)
    throw e
  }
  await fs.rm(dir, { recursive: true, force: true })
}
