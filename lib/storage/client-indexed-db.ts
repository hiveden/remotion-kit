// lib/storage/client-indexed-db.ts
//
// Client-side StorageProvider — fully wires IndexedDB persistence and the
// stateless /api/llm/raw endpoint, deferring only the esbuild-wasm + Blob URL
// bundler step that needs the cross-browser spike from the v0.3 worktree.
//
// What this implementation actually does (today):
//   - ensureSession() opens IndexedDB 'remotion-kit/v1', store 'compositions'
//   - callGenerate(req) POSTs /api/llm/raw, persists { tsx, generatedAt, … }
//     under the fixed 'client-session' key
//   - composition(clipId) returns a factory that reads the stored tsx and
//     throws STORAGE_BUNDLER_PENDING. <CompositionErrorBoundary> catches that
//     and shows a graceful "switch to ?storage=server-fixed-session" panel.
//
// What's still gated by the v0.3 spike (storage-provider-interface §3.2):
//   - esbuild-wasm bundling of the tsx → ESM
//   - Browser import map / Blob URL for the bundle to import React + Remotion
//     from the host page (option A in the spec)
//   - Service-worker proxy fallback for browsers that can't resolve via the
//     import map (option C)
//
// Everything except those three lives behind the StorageProvider interface
// already, so the v0.3 worktree only needs to slot in the bundle step.

import type {
  CompositionFactory,
  GenerateRequest,
  GenerateResult,
  StorageProvider,
} from './types'
import { makeStorageError } from './types'

const SESSION_CLIP_ID = 'client-session'
const DB_NAME = 'remotion-kit'
const DB_VERSION = 1
const STORE = 'compositions'

interface StoredComposition {
  clipId: string
  tsx: string
  generatedAt: string
  codeLength: number
  provider: string
  model: string
}

interface RawGenerateResponse {
  ok?: true
  text?: string
  code?: string
  codeLength?: number
  provider?: string
  model?: string
  generatedAt?: string
  durationMs?: number
  error?: { code?: string; message?: string; retryable?: boolean; traceId?: string }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(
        makeStorageError(
          'STORAGE_INDEXEDDB_UNAVAILABLE',
          'IndexedDB is not available in this environment',
        ),
      )
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.addEventListener('upgradeneeded', () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clipId' })
      }
    })
    req.addEventListener('success', () => resolve(req.result))
    req.addEventListener('error', () =>
      reject(
        makeStorageError('STORAGE_INDEXEDDB_OPEN_FAILED', req.error?.message ?? 'open failed', {
          cause: req.error,
        }),
      ),
    )
  })
}

function idbPut(db: IDBDatabase, value: StoredComposition): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.put(value)
    req.addEventListener('success', () => resolve())
    req.addEventListener('error', () =>
      reject(
        makeStorageError('STORAGE_INDEXEDDB_WRITE_FAILED', req.error?.message ?? 'write failed', {
          cause: req.error,
        }),
      ),
    )
  })
}

function idbGet(db: IDBDatabase, clipId: string): Promise<StoredComposition | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.get(clipId)
    req.addEventListener('success', () =>
      resolve((req.result as StoredComposition | undefined) ?? null),
    )
    req.addEventListener('error', () =>
      reject(
        makeStorageError('STORAGE_INDEXEDDB_READ_FAILED', req.error?.message ?? 'read failed', {
          cause: req.error,
        }),
      ),
    )
  })
}

function idbClear(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.clear()
    req.addEventListener('success', () => resolve())
    req.addEventListener('error', () =>
      reject(
        makeStorageError(
          'STORAGE_INDEXEDDB_CLEAR_FAILED',
          req.error?.message ?? 'clear failed',
        ),
      ),
    )
  })
}

export class ClientIndexedDBProvider implements StorageProvider {
  readonly mode = 'client-indexed-db' as const

  private dbPromise: Promise<IDBDatabase> | null = null

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb()
    }
    return this.dbPromise
  }

  async ensureSession(): Promise<string> {
    await this.getDb()
    return SESSION_CLIP_ID
  }

  async callGenerate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
    const db = await this.getDb()
    const r = await fetch('/api/llm/raw', {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    })
    const data = (await r.json().catch(() => ({}))) as RawGenerateResponse
    if (!r.ok || !data.ok || !data.code) {
      throw makeStorageError(
        data.error?.code ?? `HTTP ${r.status}`,
        data.error?.message ?? r.statusText,
        { retryable: data.error?.retryable, traceId: data.error?.traceId },
      )
    }
    const stored: StoredComposition = {
      clipId: SESSION_CLIP_ID,
      tsx: data.code,
      generatedAt: data.generatedAt ?? new Date().toISOString(),
      codeLength: data.codeLength ?? data.code.length,
      provider: data.provider ?? 'openai',
      model: data.model ?? 'unknown',
    }
    await idbPut(db, stored)
    return {
      ok: true,
      generatedAt: stored.generatedAt,
      codeLength: stored.codeLength,
    }
  }

  composition(clipId: string): CompositionFactory {
    const getDbFn = this.getDb.bind(this)
    return async () => {
      const db = await getDbFn()
      const stored = await idbGet(db, clipId)
      if (!stored) {
        throw makeStorageError(
          'STORAGE_COMPOSITION_NOT_FOUND',
          `No composition stored for clip ${clipId}; run generate first.`,
        )
      }
      throw makeStorageError(
        'STORAGE_BUNDLER_PENDING',
        'ClientIndexedDB stored ' +
          `${stored.codeLength} chars of generated tsx, but the v0.3 esbuild-wasm bundler isn't shipped yet. ` +
          'Switch to ?storage=server-fixed-session to render the LLM output today.',
      )
    }
  }

  async reset(): Promise<void> {
    try {
      const db = await this.getDb()
      await idbClear(db)
    } catch {
      /* best-effort */
    }
  }
}
