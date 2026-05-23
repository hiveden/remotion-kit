// lib/storage/server-fixed-session.ts
//
// Default provider for the v0.2 demo. A fixed clip id ('demo-session') is
// reused for every session; the backend's idempotent POST /api/clips +
// existing /api/clips/[id]/generate route handle the heavy lifting. This
// is a 1:1 lift of the v0.2 fix logic that used to live inline in
// useAgentGenerate.ts — moving it behind the StorageProvider interface so
// future providers (client IndexedDB, server ephemeral) can slot in without
// touching the chat dock or the Player.

import type {
  CompositionFactory,
  GenerateRequest,
  GenerateResult,
  PeekResult,
  StorageProvider,
} from './types'
import { makeStorageError } from './types'

const SESSION_CLIP_ID = 'demo-session'

interface GenerateResponseBody {
  ok?: true
  generatedAt?: string
  codeLength?: number
  error?: { code?: string; message?: string; retryable?: boolean; traceId?: string }
}

interface ClipResponseBody {
  clip: { id: string }
}

export class ServerFixedSessionProvider implements StorageProvider {
  readonly mode = 'server-fixed-session' as const

  private sessionReady: Promise<string> | null = null

  async ensureSession(signal?: AbortSignal): Promise<string> {
    if (this.sessionReady) return this.sessionReady
    this.sessionReady = (async () => {
      const r = await fetch('/api/clips', {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: SESSION_CLIP_ID, name: 'Demo Session' }),
      })
      if (!r.ok && r.status !== 409) {
        const detail = (await r.json().catch(() => ({}))) as GenerateResponseBody
        this.sessionReady = null
        throw makeStorageError(
          detail.error?.code ?? `HTTP ${r.status}`,
          detail.error?.message ?? 'session ensure failed',
          { retryable: detail.error?.retryable, traceId: detail.error?.traceId },
        )
      }
      let data: ClipResponseBody | null = null
      try {
        data = (await r.json()) as ClipResponseBody
      } catch {
        /* 409 may have no body — fall through with fixed id */
      }
      return data?.clip?.id ?? SESSION_CLIP_ID
    })()
    return this.sessionReady
  }

  async callGenerate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
    const clipId = await this.ensureSession(signal)
    const r = await fetch(`/api/clips/${clipId}/generate`, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
    })
    const data = (await r.json().catch(() => ({}))) as GenerateResponseBody
    if (!r.ok || !data.ok) {
      throw makeStorageError(
        data.error?.code ?? `HTTP ${r.status}`,
        data.error?.message ?? r.statusText,
        { retryable: data.error?.retryable, traceId: data.error?.traceId },
      )
    }
    return {
      ok: true,
      generatedAt: data.generatedAt ?? new Date().toISOString(),
      codeLength: data.codeLength ?? 0,
    }
  }

  composition(clipId: string): CompositionFactory {
    return () =>
      import(
        /* webpackInclude: /Composition\.tsx$/ */
        `@clip-workspace/${clipId}/src/Composition`
      )
  }

  async peekComposition(clipId: string, signal?: AbortSignal): Promise<PeekResult> {
    const r = await fetch(`/api/clips/${clipId}/exists`, { signal })
    if (!r.ok) {
      throw makeStorageError(
        `HTTP ${r.status}`,
        `peek exists failed for ${clipId}`,
      )
    }
    const data = (await r.json().catch(() => ({}))) as {
      exists?: boolean
      meta?: { generatedAt?: string; codeLength?: number; provider?: string; model?: string }
    }
    if (!data.exists || !data.meta) return { exists: false }
    return {
      exists: true,
      meta: {
        generatedAt: data.meta.generatedAt ?? '',
        codeLength: data.meta.codeLength ?? 0,
        provider: data.meta.provider ?? 'unknown',
        model: data.meta.model ?? 'unknown',
      },
    }
  }

  async reset(): Promise<void> {
    await fetch(`/api/clips/${SESSION_CLIP_ID}`, { method: 'DELETE' }).catch(() => {
      /* best-effort */
    })
    this.sessionReady = null
  }
}
