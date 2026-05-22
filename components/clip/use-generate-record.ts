// packages/video-gui/components/project/use-generate-record.ts
//
// Fetch /api/clips/[id]/record 用 client-side hook，返回 3-source 状态。
// ProduceTab Inspector 用它显示完整执行记录。

'use client'

import * as React from 'react'

export interface GenerateRecord {
  schemaVersion?: number
  clipId: string
  clipName: string
  scenePrompt: string | null
  durationSeconds: number | null
  cameraHint?: string | null
  references?: unknown[]
  brand?: { ref: string | null }
  composition?: {
    aspectRatio: string | null
    resolution: string | null
    publishPlatform: string | null
    captionStyle: string | null
  }
  llm?: {
    provider: string
    model: string
    usage?: unknown
  }
  systemPrompt?: string
  userPrompt?: string
  rawResponse?: string | null
  codeLength: number
  durationMs?: number
  generatedAt: string
  errorCode?: string | null
  notice?: string
}

export type RecordSource = 'persisted' | 'best-effort' | 'none'

export interface RecordResponse {
  source: RecordSource
  record?: GenerateRecord
  reason?: string
}

export function useGenerateRecord(clipId: string | null | undefined, refreshKey = 0) {
  const [state, setState] = React.useState<{
    loading: boolean
    data: RecordResponse | null
    error: string | null
  }>({ loading: false, data: null, error: null })

  React.useEffect(() => {
    if (!clipId) {
      setState({ loading: false, data: null, error: null })
      return
    }
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetch(`/api/clips/${clipId}/record`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text().catch(() => '')
          throw new Error(`HTTP ${r.status}: ${txt.slice(0, 100)}`)
        }
        return r.json() as Promise<RecordResponse>
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null })
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ loading: false, data: null, error: e.message })
      })
    return () => {
      cancelled = true
    }
  }, [clipId, refreshKey])

  return state
}
