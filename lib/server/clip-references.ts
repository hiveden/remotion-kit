// lib/server/clip-references.ts
//
// Materialize brief.references[] (free-text strings) onto disk under
// .workspace/clips/<id>/references/ so cc can grep / read them from the
// terminal alongside brief.json + src/.
//
// File layout (vs older directory-per-ref design): one flat `references.txt`,
// one line per ref. Simpler, fewer empty dirs, matches the new string[] shape.

import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { clipDirPath } from './clip-store'

const REFS_FILE = 'references.txt'

export async function syncReferences(clipId: string, refs: string[]): Promise<void> {
  const refsPath = path.join(clipDirPath(clipId), REFS_FILE)

  if (refs.length === 0) {
    await fs.rm(refsPath, { force: true })
    return
  }

  const body = refs.map((r) => r.trim()).filter(Boolean).join('\n') + '\n'
  await fs.writeFile(refsPath, body, 'utf8')
}
