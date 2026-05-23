'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import type { AgentDockHandle } from './AgentChatDock'
import { categorize } from './AgentChatDock'
import { useStorageProvider } from '@/lib/storage/use-storage-provider'
import { isStorageError, type PeekMeta } from '@/lib/storage/types'

export type CompositionSource = { kind: 'static' } | { kind: 'lazy'; clipId: string }

/**
 * `fresh` — user just submitted; `restored` — auto-recovered from provider
 * peek on mount (v0.3 T26). UI uses this to distinguish first-load chip text.
 */
export type AiGeneratedKind = false | 'fresh' | 'restored'

const DEMO_DURATION_SECONDS = 14

interface UseAgentGenerateArgs {
  brand: DemoBrandState
  brief: DemoBrief
  dockRef: React.RefObject<AgentDockHandle | null>
  onGenerated: () => void
}

interface Snapshot {
  source: CompositionSource
}

interface State {
  source: CompositionSource
  reloadKey: number
  snapshot: Snapshot | null
  aiGenerated: AiGeneratedKind
  restoring: boolean
  restoredMeta: PeekMeta | null
}

export interface UseAgentGenerate {
  source: CompositionSource
  reloadKey: number
  aiGenerated: AiGeneratedKind
  restoring: boolean
  restoredMeta: PeekMeta | null
  submit: (prompt: string) => Promise<void>
  cancel: () => void
  undo: () => void
}

/**
 * Mirror the per-provider session clip id naming. Kept in this hook so the
 * StorageProvider interface doesn't have to expose its session key.
 */
function getSessionClipId(mode: 'server-fixed-session' | 'client-indexed-db' | 'server-ephemeral'): string {
  if (mode === 'client-indexed-db') return 'client-session'
  return 'demo-session'
}

function buildScenePrompt(prompt: string, brand: DemoBrandState, brief: DemoBrief): string {
  return [
    `User intent: ${prompt}`,
    `Brand: ${brand.name} (primary ${brand.colors.primary}, secondary ${brand.colors.secondary ?? 'n/a'})`,
    `Cover: ${brief.cover.title} — ${brief.cover.subtitle}`,
    `Body: ${brief.body.title}`,
    `CTA: ${brief.cta.text}`,
    `Metrics: ${
      brief.cover.metrics
        .filter((m) => m.value || m.label)
        .map((m) => `${m.value} ${m.label}`)
        .join(', ') || 'none'
    }`,
  ].join('\n')
}

export function useAgentGenerate({
  brand,
  brief,
  dockRef,
  onGenerated,
}: UseAgentGenerateArgs): UseAgentGenerate {
  const provider = useStorageProvider()
  const [state, setState] = React.useState<State>({
    source: { kind: 'static' },
    reloadKey: 0,
    snapshot: null,
    aiGenerated: false,
    restoring: false,
    restoredMeta: null,
  })
  const abortRef = React.useRef<AbortController | null>(null)
  const latestRef = React.useRef({ brand, brief })
  React.useEffect(() => {
    latestRef.current = { brand, brief }
  }, [brand, brief])

  // v0.3 T26: when the provider resolves on first mount, probe for an
  // existing composition and auto-restore source=lazy if one is found. The
  // peek is lightweight (IDB row meta or HEAD-ish exists endpoint) — it
  // never loads the full tsx or triggers ensureSession side effects.
  // We don't bump reloadKey here: the initial mount isn't a "reload" from
  // the Player's perspective, and bumping forced an extra remount race
  // (Block 6 lesson).
  const peekStartedRef = React.useRef(false)
  React.useEffect(() => {
    if (!provider) return
    if (peekStartedRef.current) return
    peekStartedRef.current = true
    setState((s) => ({ ...s, restoring: true }))
    const ac = new AbortController()
    let alive = true
    provider.peekComposition(getSessionClipId(provider.mode), ac.signal).then(
      (result) => {
        if (!alive) return
        if (result.exists) {
          const clipId = getSessionClipId(provider.mode)
          setState((s) => ({
            ...s,
            source: { kind: 'lazy', clipId },
            // snapshot the static default so `undo()` can restore it without
            // touching the persisted entry.
            snapshot: { source: { kind: 'static' } },
            aiGenerated: 'restored',
            restoring: false,
            restoredMeta: result.meta,
          }))
        } else {
          setState((s) => ({ ...s, restoring: false }))
        }
      },
      (e: unknown) => {
        if (!alive) return
        setState((s) => ({ ...s, restoring: false }))
        // PM red-line: never silently fall back. Surface the failure so the
        // user sees something happened, without breaking the static default.
        const dock = dockRef.current
        if (!dock) return
        if (isStorageError(e)) {
          dock.reportError({ category: categorize(e.code), code: e.code, message: e.message })
        } else {
          const err = e as { message?: string }
          dock.reportError({
            category: 'SYSTEM',
            code: 'STORAGE_PEEK_FAILED',
            message: err.message ?? 'restore probe failed',
          })
        }
      },
    )
    return () => {
      alive = false
      ac.abort()
    }
  }, [provider, dockRef])

  async function submit(promptText: string) {
    const dock = dockRef.current
    if (!dock) return
    if (!provider) {
      dock.reportError({
        category: 'SYSTEM',
        code: 'STORAGE_NOT_READY',
        message: 'storage provider 还未加载，稍后再试',
      })
      return
    }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const startMs = Date.now()
    const latest = latestRef.current
    const snapshot: Snapshot = { source: state.source }
    dock.reportSubmit()
    try {
      const clipId = await provider.ensureSession(ac.signal)
      dock.reportStreaming()
      const result = await provider.callGenerate(
        {
          scenePrompt: buildScenePrompt(promptText, latest.brand, latest.brief),
          durationSeconds: DEMO_DURATION_SECONDS,
        },
        ac.signal,
      )
      const elapsed = (Date.now() - startMs) / 1000
      const isMock = result.codeLength > 0 && elapsed < 1.5
      setState((s) => ({
        source: { kind: 'lazy', clipId },
        reloadKey: s.reloadKey + 1,
        snapshot,
        aiGenerated: 'fresh',
        restoring: false,
        // A fresh submit supersedes the restored entry's meta; clear it so
        // the chip stops saying "restored from {mode}".
        restoredMeta: null,
      }))
      dock.reportDone(elapsed, isMock)
      onGenerated()
    } catch (e) {
      if (ac.signal.aborted) {
        dock.reportError({ category: 'SYSTEM', code: 'SYSTEM_CANCELLED', message: 'cancelled' })
        return
      }
      if (isStorageError(e)) {
        dock.reportError({
          category: categorize(e.code),
          code: e.code,
          message: e.message,
        })
        return
      }
      const err = e as { code?: string; message?: string }
      const code = err.code ?? 'SYSTEM_UNKNOWN'
      dock.reportError({ category: categorize(code), code, message: err.message ?? String(e) })
    }
  }

  function cancel() {
    abortRef.current?.abort()
  }

  function undo() {
    setState((s) => {
      if (!s.snapshot) return s
      return {
        source: s.snapshot.source,
        reloadKey: s.reloadKey + 1,
        snapshot: null,
        aiGenerated: false,
        restoring: false,
        restoredMeta: null,
      }
    })
  }

  return {
    source: state.source,
    reloadKey: state.reloadKey,
    aiGenerated: state.aiGenerated,
    restoring: state.restoring,
    restoredMeta: state.restoredMeta,
    submit,
    cancel,
    undo,
  }
}
