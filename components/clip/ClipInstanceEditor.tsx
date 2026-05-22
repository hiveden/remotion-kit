// components/clip/ClipInstanceEditor.tsx
//
// Detail page: header + left (Brief / References / Generate / Takes) + right (Preview).
// 800ms debounced PUT; name + select onBlur persists immediately.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClipBrief } from '@/lib/editor/clip-instance'
import { ClipBriefForm } from './ClipBriefForm'
import { ClipReferencesInline } from './ClipReferencesInline'
import { ClipPreviewPane } from './ClipPreviewPane'
import { ClipGenerateSection } from './ClipGenerateSection'
import { TakeHistoryStrip } from './TakeHistoryStrip'

interface Props {
  brief: ClipBrief
  clipDir: string // 由 server component 透传的本地绝对路径
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ClipInstanceEditor({ brief: initial, clipDir }: Props) {
  const router = useRouter()
  const [brief, setBrief] = useState(initial)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [reloadKey, setReloadKey] = useState(0)
  const [takesRefreshKey, setTakesRefreshKey] = useState(0)
  const pendingRef = useRef<Partial<ClipBrief> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    const patch = pendingRef.current
    pendingRef.current = null
    if (!patch) return
    setSaveState('saving')
    try {
      const res = await fetch(`/api/clips/${brief.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        setSaveState('error')
        return
      }
      const data = (await res.json()) as { clip: ClipBrief }
      setBrief(data.clip)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [brief.id])

  const queueUpdate = useCallback(
    (patch: Partial<ClipBrief>) => {
      pendingRef.current = { ...pendingRef.current, ...patch }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => { void flush() }, 800)
    },
    [flush],
  )

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  function onNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    const v = e.target.value.trim()
    if (!v || v === brief.name) return
    queueUpdate({ name: v })
  }

  function onBriefFormChange(patch: Partial<ClipBrief>) {
    setBrief((b) => ({ ...b, ...patch }))
    queueUpdate(patch)
  }

  function onReferencesChange(refs: string[]) {
    setBrief((b) => ({ ...b, references: refs }))
    queueUpdate({ references: refs })
  }

  async function onArchive(archived: boolean) {
    await fetch(`/api/clips/${brief.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: archived ? 'archived' : 'draft' }),
    })
    router.push('/clip')
    router.refresh()
  }

  async function onDelete() {
    if (!confirm(`删除 ${brief.name}？不可恢复`)) return
    await fetch(`/api/clips/${brief.id}`, { method: 'DELETE' })
    router.push('/clip')
    router.refresh()
  }

  const ccCmd = `cd ${clipDir} && cc`

  return (
    <div
      className="flex h-full flex-col"
      data-testid="clip-editor-root"
      data-state={saveState}
    >
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/clip')}
            className="text-sm text-muted-foreground hover:underline"
            data-testid="clip-editor-back"
          >
            ← Clip list
          </button>
          <input
            defaultValue={brief.name}
            onBlur={onNameBlur}
            className="rounded border bg-transparent px-2 py-1 text-base font-medium"
            data-testid="clip-editor-name"
          />
          <span
            className="text-xs text-muted-foreground"
            data-testid="clip-editor-save-state"
          >
            {saveState === 'saving' && '保存中…'}
            {saveState === 'saved' && '已保存'}
            {saveState === 'error' && '保存失败'}
            {saveState === 'idle' && ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <CopyChip label="path" value={clipDir} testid="clip-editor-copy-path" />
          <CopyChip label="cd && cc" value={ccCmd} testid="clip-editor-copy-cmd" />
          <button
            onClick={() => { void onArchive(brief.status !== 'archived') }}
            className="rounded border px-2 py-1 hover:bg-accent"
            data-testid="clip-editor-archive"
          >
            {brief.status === 'archived' ? 'Unarchive' : 'Archive'}
          </button>
          <button
            onClick={() => { void onDelete() }}
            className="rounded border px-2 py-1 hover:bg-destructive hover:text-destructive-foreground"
            data-testid="clip-editor-delete"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[420px_1fr] overflow-hidden">
        <aside
          className="flex flex-col overflow-auto border-r"
          data-testid="clip-editor-brief-pane"
        >
          <ClipBriefForm brief={brief} onChange={onBriefFormChange} />
          <ClipReferencesInline references={brief.references} onChange={onReferencesChange} />
          <ClipGenerateSection
            brief={brief}
            onGenerated={() => {
              setReloadKey((k) => k + 1)
              setTakesRefreshKey((k) => k + 1)
            }}
          />
          <div
            className="border-t bg-neutral-950/30 p-3"
            data-testid="clip-editor-takes-pane"
          >
            <TakeHistoryStrip
              clipId={brief.id}
              refreshKey={takesRefreshKey}
              onSwitched={() => {
                setReloadKey((k) => k + 1)
                setTakesRefreshKey((k) => k + 1)
              }}
            />
          </div>
        </aside>
        <main className="overflow-hidden" data-testid="clip-editor-preview-pane">
          <ClipPreviewPane brief={brief} reloadKey={reloadKey} />
        </main>
      </div>
    </div>
  )
}

function CopyChip({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <button
      title={value}
      onClick={() => { void navigator.clipboard.writeText(value) }}
      className="rounded border px-2 py-1 font-mono hover:bg-accent"
      data-testid={testid}
    >
      📋 {label}
    </button>
  )
}
