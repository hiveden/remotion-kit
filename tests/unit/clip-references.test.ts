import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import { promises as fs } from 'node:fs'

let TMP_ROOT: string
process.env.ASTRAL_ROOT_OVERRIDE = (TMP_ROOT = path.join(
  os.tmpdir(),
  `clip-refs-test-${Date.now()}`,
))

const { syncReferences } = await import('@/lib/server/clip-references')
const { clipDirPath } = await import('@/lib/server/clip-store')

beforeEach(async () => {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
})
afterEach(async () => {
  await fs.rm(TMP_ROOT, { recursive: true, force: true })
})

describe('syncReferences', () => {
  it('empty array removes the references.txt file', async () => {
    const id = 'clip-deadbeef'
    await fs.mkdir(clipDirPath(id), { recursive: true })
    const refsPath = path.join(clipDirPath(id), 'references.txt')
    await fs.writeFile(refsPath, 'stale\n', 'utf8')
    await syncReferences(id, [])
    await expect(fs.access(refsPath)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('writes one trimmed reference per line', async () => {
    const id = 'clip-deadbeef'
    await fs.mkdir(clipDirPath(id), { recursive: true })
    await syncReferences(id, [
      'https://example.com/inspo-1',
      '  light pastel palette, slow zoom  ',
      'kinetic typography',
    ])
    const body = await fs.readFile(path.join(clipDirPath(id), 'references.txt'), 'utf8')
    expect(body).toBe(
      'https://example.com/inspo-1\nlight pastel palette, slow zoom\nkinetic typography\n',
    )
  })

  it('skips blank entries silently', async () => {
    const id = 'clip-deadbeef'
    await fs.mkdir(clipDirPath(id), { recursive: true })
    await syncReferences(id, ['real ref', '   ', ''])
    const body = await fs.readFile(path.join(clipDirPath(id), 'references.txt'), 'utf8')
    expect(body).toBe('real ref\n')
  })
})
