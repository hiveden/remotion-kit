// lib/storage/client-indexed-db.ts
//
// Stub provider for the eventual client-side persistence path. The spec
// (.workspace/design/storage-provider-interface-2026-05-23.md §3.2) walked
// through the full plan — esbuild-wasm to transpile/bundle the LLM-generated
// tsx, IndexedDB for the bundle bytes, and a Blob URL the Player can
// `import()`. Three risks block shipping this in the v0.2 timebox:
//
//   1. esbuild-wasm adds ~10MB to the client bundle (lazy load mandatory)
//   2. React/Remotion need to resolve from the host page rather than from
//      the Blob — requires either browser import maps (still patchy on
//      Safari/Firefox) or a service-worker proxy (option C in the spec)
//   3. Blob URL `import()` works in Chromium, partial in Safari 17+, and
//      Firefox has known limitations as of the last status check
//
// Until those three are validated end-to-end, calling the client provider
// throws `STORAGE_NOT_IMPLEMENTED`. The factory in `lib/storage/index.ts`
// silently falls back to the server provider so the demo never breaks.

import type {
  CompositionFactory,
  GenerateRequest,
  GenerateResult,
  StorageProvider,
} from './types'
import { makeStorageError } from './types'

export class ClientIndexedDBProvider implements StorageProvider {
  readonly mode = 'client-indexed-db' as const

  async ensureSession(): Promise<string> {
    throw makeStorageError(
      'STORAGE_NOT_IMPLEMENTED',
      'ClientIndexedDBProvider is reserved for v0.3 — spec at .workspace/design/storage-provider-interface-2026-05-23.md §3.2.',
    )
  }

  async callGenerate(_req: GenerateRequest): Promise<GenerateResult> {
    throw makeStorageError(
      'STORAGE_NOT_IMPLEMENTED',
      'ClientIndexedDBProvider is reserved for v0.3.',
    )
  }

  composition(_clipId: string): CompositionFactory {
    return async () => {
      throw makeStorageError(
        'STORAGE_NOT_IMPLEMENTED',
        'ClientIndexedDBProvider is reserved for v0.3.',
      )
    }
  }

  async reset(): Promise<void> {
    /* no-op until provider ships */
  }
}
