'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import type { AgentDockHandle } from './AgentChatDock'
import { categorize } from './AgentChatDock'

export type CompositionSource = { kind: 'static' } | { kind: 'lazy'; clipId: string }

const SESSION_CLIP_ID = 'demo-session'
const DEMO_DURATION_SECONDS = 14

interface GenerateResponse {
  ok?: true
  clipId?: string
  generatedAt?: string
  codeLength?: number
  error?: { code?: string; message?: string; retryable?: boolean; traceId?: string }
}

interface ClipResponse {
  clip: { id: string }
}

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
  aiGenerated: boolean
}

export interface UseAgentGenerate {
  source: CompositionSource
  reloadKey: number
  aiGenerated: boolean
  submit: (prompt: string) => Promise<void>
  cancel: () => void
  undo: () => void
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
  const [state, setState] = React.useState<State>({
    source: { kind: 'static' },
    reloadKey: 0,
    snapshot: null,
    aiGenerated: false,
  })
  const abortRef = React.useRef<AbortController | null>(null)
  const sessionReadyRef = React.useRef<Promise<string> | null>(null)
  const latestRef = React.useRef({ brand, brief })
  React.useEffect(() => {
    latestRef.current = { brand, brief }
  }, [brand, brief])

  async function ensureSession(signal: AbortSignal): Promise<string> {
    if (sessionReadyRef.current) return sessionReadyRef.current
    sessionReadyRef.current = (async () => {
      // POST is idempotent for fixed `demo-session` id (T20 backend contract).
      const r = await fetch('/api/clips', {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: SESSION_CLIP_ID, name: 'Demo Session' }),
      })
      if (!r.ok && r.status !== 409) {
        const detail = (await r.json().catch(() => ({}))) as GenerateResponse
        const code = detail.error?.code ?? `HTTP ${r.status}`
        sessionReadyRef.current = null
        throw Object.assign(new Error(detail.error?.message ?? 'session ensure failed'), { code })
      }
      let data: ClipResponse | null = null
      try {
        data = (await r.json()) as ClipResponse
      } catch {
        /* 409 may have no body — fall through with fixed id */
      }
      return data?.clip?.id ?? SESSION_CLIP_ID
    })()
    return sessionReadyRef.current
  }

  async function submit(promptText: string) {
    const dock = dockRef.current
    if (!dock) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const startMs = Date.now()
    const latest = latestRef.current
    const snapshot: Snapshot = { source: state.source }
    dock.reportSubmit()
    try {
      const clipId = await ensureSession(ac.signal)
      dock.reportStreaming()
      const r = await fetch(`/api/clips/${clipId}/generate`, {
        method: 'POST',
        signal: ac.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scenePrompt: buildScenePrompt(promptText, latest.brand, latest.brief),
          durationSeconds: DEMO_DURATION_SECONDS,
        }),
      })
      const data = (await r.json().catch(() => ({}))) as GenerateResponse
      if (!r.ok || !data.ok) {
        const code = data.error?.code ?? `HTTP ${r.status}`
        dock.reportError({
          category: categorize(code),
          code,
          message: data.error?.message ?? r.statusText,
        })
        return
      }
      const elapsed = (Date.now() - startMs) / 1000
      const isMock = (data.codeLength ?? 0) > 0 && elapsed < 1.5
      setState((s) => ({
        source: { kind: 'lazy', clipId },
        reloadKey: s.reloadKey + 1,
        snapshot,
        aiGenerated: true,
      }))
      dock.reportDone(elapsed, isMock)
      onGenerated()
    } catch (e) {
      if (ac.signal.aborted) {
        dock.reportError({ category: 'SYSTEM', code: 'SYSTEM_CANCELLED', message: 'cancelled' })
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
      }
    })
  }

  return {
    source: state.source,
    reloadKey: state.reloadKey,
    aiGenerated: state.aiGenerated,
    submit,
    cancel,
    undo,
  }
}
