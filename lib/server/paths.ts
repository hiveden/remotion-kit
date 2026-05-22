import 'server-only'

// Path constants. We use process.cwd() as the project root because Next.js
// rewrites import.meta.url at bundle time and dev / start both launch from
// the project root. Override with REMOTION_KIT_ROOT if you launch from
// elsewhere.

import path from 'node:path'

export const PROJECT_ROOT =
  process.env.REMOTION_KIT_ROOT ??
  process.env.ASTRAL_ROOT_OVERRIDE ??
  process.cwd()

// Clip instance persistence root. One directory per clip:
//   .workspace/clips/<id>/brief.json
//   .workspace/clips/<id>/src/Composition.tsx
//   .workspace/clips/<id>/references.txt
//   .workspace/clips/<id>/.meta/...
export const CLIPS_ROOT = path.join(PROJECT_ROOT, '.workspace', 'clips')

export const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public')

export const PORT = 3200

const ID_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

export function isValidClipId(id: unknown): id is string {
  return typeof id === 'string' && ID_REGEX.test(id)
}

export class InvalidClipIdError extends Error {
  constructor(id: unknown) {
    super(`invalid clip id: ${JSON.stringify(id)} (must match ${ID_REGEX.source})`)
    this.name = 'InvalidClipIdError'
  }
}

export function assertValidClipId(id: unknown): asserts id is string {
  if (!isValidClipId(id)) throw new InvalidClipIdError(id)
}

export function joinUnderRoot(root: string, id: string, ...rest: string[]): string {
  assertValidClipId(id)
  const joined = path.resolve(root, id, ...rest)
  const rootResolved = path.resolve(root)
  if (joined !== rootResolved && !joined.startsWith(rootResolved + path.sep)) {
    throw new Error(
      `path escape detected: ${joined} not under ${rootResolved} (id=${JSON.stringify(id)})`,
    )
  }
  return joined
}
