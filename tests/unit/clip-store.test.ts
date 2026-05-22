import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import { promises as fs } from 'node:fs'

// 必须在 import store 前设置 env，让 paths.ts 取到正确 root
let TMP_ROOT: string
process.env.ASTRAL_ROOT_OVERRIDE = (TMP_ROOT = path.join(os.tmpdir(), `clip-store-test-${Date.now()}`))

const { writeBrief, readBrief, listBriefs, deleteClip, clipDirPath, ClipNotFoundError, ClipConflictError, InvalidClipIdError } =
  await import('@/lib/server/clip-store')
const { DEFAULT_BRIEF } = await import('@/lib/editor/clip-instance')

function makeBrief(id = 'test-deadbeef', name = 'Test') {
  const now = new Date().toISOString()
  return { ...DEFAULT_BRIEF, id, name, createdAt: now, updatedAt: now }
}

beforeEach(async () => {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
})
afterEach(async () => {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
})

describe('clip-store directory form', () => {
  it('writeBrief 创建目录 + brief.json', async () => {
    const b = makeBrief()
    await writeBrief(b, { mustNotExist: true })
    const dir = clipDirPath(b.id)
    const stat = await fs.stat(dir)
    expect(stat.isDirectory()).toBe(true)
    const json = await fs.readFile(path.join(dir, 'brief.json'), 'utf8')
    expect(JSON.parse(json).id).toBe(b.id)
  })

  it('readBrief 找不到 → null', async () => {
    const got = await readBrief('not-deadbeef')
    expect(got).toBeNull()
  })

  it('listBriefs 默认排除 archived', async () => {
    const a = makeBrief('aaa-deadbeef')
    const b = { ...makeBrief('bbb-deadbeef'), status: 'archived' as const }
    await writeBrief(a)
    await writeBrief(b)
    const list = await listBriefs()
    expect(list.map((x) => x.id).toSorted()).toEqual(['aaa-deadbeef'])
    const all = await listBriefs({ includeArchived: true })
    expect(all).toHaveLength(2)
  })

  it('mustNotExist + 已存在 → ClipConflictError', async () => {
    const b = makeBrief()
    await writeBrief(b, { mustNotExist: true })
    await expect(writeBrief(b, { mustNotExist: true })).rejects.toBeInstanceOf(ClipConflictError)
  })

  it('deleteClip 物理删整个目录', async () => {
    const b = makeBrief()
    await writeBrief(b)
    await deleteClip(b.id)
    await expect(fs.access(clipDirPath(b.id))).rejects.toThrow()
  })

  it('deleteClip 不存在 → ClipNotFoundError', async () => {
    await expect(deleteClip('ghost-deadbeef')).rejects.toBeInstanceOf(ClipNotFoundError)
  })

  it('非法 id → InvalidClipIdError', async () => {
    await expect(readBrief('../etc/passwd' as never)).rejects.toBeInstanceOf(InvalidClipIdError)
  })

  it('writeBrief 写已存在 clip → 覆盖 brief.json，保留 src/', async () => {
    const b = makeBrief()
    await writeBrief(b)
    const srcPath = path.join(clipDirPath(b.id), 'src')
    await fs.mkdir(srcPath, { recursive: true })
    await fs.writeFile(path.join(srcPath, 'Composition.tsx'), '// cc wrote this', 'utf8')
    await writeBrief({ ...b, note: 'updated' })
    const updated = await readBrief(b.id)
    expect(updated?.note).toBe('updated')
    const ccCode = await fs.readFile(path.join(srcPath, 'Composition.tsx'), 'utf8')
    expect(ccCode).toBe('// cc wrote this')
  })
})
