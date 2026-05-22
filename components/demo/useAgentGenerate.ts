'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import type { AgentDockHandle } from './AgentChatDock'
import { categorize } from './AgentChatDock'

interface UseAgentGenerateArgs {
  brand: DemoBrandState
  brief: DemoBrief
  dockRef: React.RefObject<AgentDockHandle | null>
}

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

const DEMO_DURATION_SECONDS = 14

// Map DemoBrief.subtitleStyle → ClipBrief.captionStyle. Both schemas use
// `'classic' | 'bold' | 'lecture'` so this is identity, but keeping the map
// explicit so a future schema drift doesn't silently break.
function buildScenePrompt(prompt: string, brand: DemoBrandState, brief: DemoBrief): string {
  return [
    `User intent: ${prompt}`,
    `Brand: ${brand.name} (primary ${brand.colors.primary}, secondary ${brand.colors.secondary ?? 'n/a'})`,
    `Cover: ${brief.cover.title} — ${brief.cover.subtitle}`,
    `Body: ${brief.body.title}`,
    `CTA: ${brief.cta.text}`,
    `Metrics: ${brief.cover.metrics
      .filter((m) => m.value || m.label)
      .map((m) => `${m.value} ${m.label}`)
      .join(', ') || 'none'}`,
  ].join('\n')
}

export function useAgentGenerate({ brand, brief, dockRef }: UseAgentGenerateArgs) {
  const sessionClipIdRef = React.useRef<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  async function ensureSessionClip(signal: AbortSignal): Promise<string> {
    if (sessionClipIdRef.current) return sessionClipIdRef.current
    const r = await fetch('/api/clips', {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `demo-session-${Date.now()}` }),
    })
    if (!r.ok) {
      const detail = (await r.json().catch(() => ({}))) as GenerateResponse
      const code = detail.error?.code ?? `HTTP ${r.status}`
      throw Object.assign(new Error(detail.error?.message ?? 'create clip failed'), { code })
    }
    const data = (await r.json()) as ClipResponse
    sessionClipIdRef.current = data.clip.id
    return data.clip.id
  }

  async function submit(promptText: string) {
    const dock = dockRef.current
    if (!dock) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const start = Date.now()
    dock.reportSubmit()
    try {
      const clipId = await ensureSessionClip(ac.signal)
      dock.reportStreaming()
      const r = await fetch(`/api/clips/${clipId}/generate`, {
        method: 'POST',
        signal: ac.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scenePrompt: buildScenePrompt(promptText, brand, brief),
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
      const elapsed = (Date.now() - start) / 1000
      const isMock = (data.codeLength ?? 0) > 0 && elapsed < 1.5
      dock.reportDone(elapsed, isMock)
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

  return { submit, cancel }
}
