// lib/storage/client-indexed-db.ts
//
// Client-side StorageProvider — runs the full generate → persist → render
// loop in the browser with zero server-side state.
//
//   - ensureSession() opens IndexedDB 'remotion-kit/v1', store 'compositions'
//   - callGenerate(req) POSTs /api/llm/raw, persists { tsx, generatedAt, … }
//     under the fixed 'client-session' key
//   - composition(clipId) reads the stored tsx, runs it through the
//     esbuild-wasm bundler (lib/storage/client-bundler.ts), and returns the
//     evaluated React component so the Remotion Player can lazy-mount it.
//
// The bundler resolves bare imports (react, remotion, @remotion/player)
// against window.__rkHostModules, which lib/storage/host-globals.ts registers
// from the host page so we share the same React instance.

import type {
  CompositionFactory,
  GenerateRequest,
  GenerateResult,
  StorageProvider,
} from './types'
import { makeStorageError } from './types'
import { evaluateBundle, transformTsx } from './client-bundler'

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
      let code: string
      try {
        code = await transformTsx(stored.tsx)
      } catch (e) {
        throw makeStorageError(
          'STORAGE_BUNDLE_FAILED',
          e instanceof Error ? e.message : String(e),
          { cause: e },
        )
      }
      let Component
      try {
        Component = evaluateBundle(code)
      } catch (e) {
        throw makeStorageError(
          'STORAGE_BUNDLE_EVAL_FAILED',
          e instanceof Error ? e.message : String(e),
          { cause: e },
        )
      }
      return { default: Component }
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
