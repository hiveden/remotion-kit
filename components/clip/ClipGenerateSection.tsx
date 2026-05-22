// components/clip/ClipGenerateSection.tsx
//
// "AI generate" panel on the clip detail page. Pre-fills scenePrompt /
// cameraHint / durationSeconds from /api/clips/[id]/record, lets the user
// edit, and POSTs /api/clips/[id]/generate. On success, router.refresh()
// reloads the composition so the Player picks up the new code.
//
// record endpoint returns three sources:
//   persisted   — .meta/last-generate.json on disk, all fields present
//   best-effort — Composition.tsx exists but no record; scenePrompt null
//   none        — scaffold placeholder; ask the user to fill a prompt

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { ClipBrief } from '@/lib/editor/clip-instance'
import { useGenerateRecord } from './use-generate-record'

interface Props {
  brief: ClipBrief
  onGenerated?: () => void
}

type GenState = 'idle' | 'generating' | 'done' | 'error'

export function ClipGenerateSection({ brief, onGenerated }: Props) {
  const router = useRouter()
  const { data: recordData, loading: recordLoading } = useGenerateRecord(brief.id)

  // Local editable fields；先用 brief 默认值，record 拿到后 hydrate 一次
  const [scenePrompt, setScenePrompt] = React.useState('')
  const [cameraHint, setCameraHint] = React.useState('')
  const [durationSeconds, setDurationSeconds] = React.useState(brief.targetDuration ?? 4)
  const hydratedRef = React.useRef(false)

  React.useEffect(() => {
    if (hydratedRef.current) return
    if (recordLoading) return
    if (!recordData) return
    const r = recordData.record
    if (recordData.source === 'persisted' && r) {
      setScenePrompt(r.scenePrompt ?? '')
      setCameraHint(r.cameraHint ?? '')
      if (typeof r.durationSeconds === 'number') setDurationSeconds(r.durationSeconds)
    } else if (recordData.source === 'best-effort' && r) {
      // best-effort 没存 prompt — 留空让 user 自己填
      if (typeof r.durationSeconds === 'number') setDurationSeconds(r.durationSeconds)
    }
    hydratedRef.current = true
  }, [recordData, recordLoading])

  const [state, setState] = React.useState<GenState>('idle')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [genResult, setGenResult] = React.useState<{ generatedAt: string; codeLength: number } | null>(null)

  const canGenerate = scenePrompt.trim().length > 0 && durationSeconds > 0 && state !== 'generating'

  async function onGenerate() {
    if (!canGenerate) return
    setState('generating')
    setErrorMsg(null)
    setGenResult(null)
    try {
      const res = await fetch(`/api/clips/${brief.id}/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scenePrompt: scenePrompt.trim(),
          durationSeconds,
          cameraHint: cameraHint.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } }
        const code = err.error?.code ?? `HTTP ${res.status}`
        const msg = err.error?.message ?? res.statusText
        setErrorMsg(`${code}: ${msg}`)
        setState('error')
        return
      }
      const data = (await res.json()) as { ok: true; clipId: string; generatedAt: string; codeLength: number }
      setGenResult({ generatedAt: data.generatedAt, codeLength: data.codeLength })
      setState('done')
      onGenerated?.()
      // 让 Player 重新 import 新代码（webpack alias dynamic import 走 module cache，
      // router.refresh() 让 server component reload；此外 ClipPreviewPane 的 [↻ 重载]
      // 按钮可手动触发；这里 trigger refresh + 提示成功即可）
      router.refresh()
    } catch (e) {
      setErrorMsg((e as Error).message)
      setState('error')
    }
  }

  function sourceChip(): React.ReactNode {
    if (recordLoading) return <span className="text-muted-foreground">loading…</span>
    if (!recordData) return null
    if (recordData.source === 'persisted') return <span className="text-emerald-300">✓ 复用上次 prompt</span>
    if (recordData.source === 'best-effort') return <span className="text-amber-300">⚠ 上次记录无 prompt（旧 generate）— 重新填写</span>
    return <span className="text-muted-foreground">○ 该 clip 未生成过；先填 prompt</span>
  }

  return (
    <section className="flex flex-col gap-2 border-t bg-neutral-950/30 p-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">AI 生成 · refinement</h3>
        <div className="text-[10px]">{sourceChip()}</div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Scene prompt</label>
        <textarea
          value={scenePrompt}
          onChange={(e) => setScenePrompt(e.target.value)}
          rows={5}
          placeholder="描述你想要的视频画面 / 节奏 / 文案…"
          className="w-full rounded border border-white/10 bg-background p-2 text-xs disabled:opacity-60"
          disabled={state === 'generating'}
        />
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">Camera hint (可选)</label>
          <input
            type="text"
            value={cameraHint}
            onChange={(e) => setCameraHint(e.target.value)}
            placeholder="例：中心对齐，缓慢推近"
            className="w-full rounded border border-white/10 bg-background px-2 py-1 text-xs disabled:opacity-60"
            disabled={state === 'generating'}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Duration (s)</label>
          <input
            type="number"
            min={1}
            max={60}
            step={1}
            value={durationSeconds}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n) && n >= 1) setDurationSeconds(n)
            }}
            disabled={state === 'generating'}
            className="w-20 rounded border border-white/10 bg-background px-2 py-1 text-xs disabled:opacity-60"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={!canGenerate}
        className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'generating' ? '⏳ 生成中…（qwen 27b 本地推理 3-15 min，请耐心）' : '▶ 重新生成 Composition.tsx'}
      </button>

      {state === 'error' && errorMsg ? (
        <div className="rounded border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-200">
          ⚠ 生成失败：{errorMsg}
        </div>
      ) : null}

      {state === 'done' && genResult ? (
        <div className="rounded border border-emerald-500/50 bg-emerald-500/10 p-2 text-xs text-emerald-200">
          ✓ 生成成功 · {genResult.codeLength} chars at {new Date(genResult.generatedAt).toLocaleTimeString()}
          <br />
          预览已自动刷新（如未变化点右边 [↻ 重载]）。
        </div>
      ) : null}

      {recordData?.source === 'persisted' && recordData.record?.systemPrompt ? (
        <details className="text-[10px] text-muted-foreground">
          <summary className="cursor-pointer hover:text-white">查看上次的 system prompt + raw response</summary>
          <div className="mt-1 flex flex-col gap-1">
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-white/10 bg-neutral-900/40 p-1">{recordData.record.systemPrompt}</pre>
            {recordData.record.rawResponse ? (
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-white/10 bg-neutral-900/40 p-1">{recordData.record.rawResponse.slice(0, 2000)}</pre>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  )
}
