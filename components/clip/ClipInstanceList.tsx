// packages/video-gui/components/clip/ClipInstanceList.tsx
//
// 列表客户端组件：[+ New clip] 直接 POST → router.push。
// 接 server component 传入的 initialClips / initialIncludeArchived / flashError。
//
// SSOT: DESIGN.md §7

'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ClipBrief } from '@/lib/editor/clip-instance'
import { ClipInstanceCard } from './ClipInstanceCard'

interface Props {
  initialClips: ClipBrief[]
  initialIncludeArchived: boolean
  flashError: string | null
}

export function ClipInstanceList({ initialClips, initialIncludeArchived, flashError }: Props) {
  const router = useRouter()
  const [clips, setClips] = useState(initialClips)
  const [includeArchived, setIncludeArchived] = useState(initialIncludeArchived)
  const [error, setError] = useState<string | null>(flashError)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!flashError) return
    const t = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(t)
  }, [flashError])

  async function refresh(inc: boolean) {
    const res = await fetch(`/api/clips${inc ? '?include=archived' : ''}`)
    if (res.ok) {
      const data = (await res.json()) as { clips: ClipBrief[] }
      setClips(data.clips)
    }
  }

  async function onNew() {
    const res = await fetch('/api/clips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled clip' }),
    })
    if (res.ok) {
      const data = (await res.json()) as { clip: ClipBrief }
      router.push(`/clip/${data.clip.id}`)
    } else {
      setError(`create failed: ${res.status}`)
    }
  }

  async function onArchive(id: string, archived: boolean) {
    await fetch(`/api/clips/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: archived ? 'archived' : 'draft' }),
    })
    startTransition(() => { void refresh(includeArchived) })
  }

  async function onDelete(id: string) {
    if (!confirm('永久删除？不可恢复')) return
    await fetch(`/api/clips/${id}`, { method: 'DELETE' })
    startTransition(() => { void refresh(includeArchived) })
  }

  async function onDuplicate(id: string) {
    const src = clips.find((c) => c.id === id)
    if (!src) return
    const res = await fetch('/api/clips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `${src.name} (copy)` }),
    })
    if (res.ok) {
      const data = (await res.json()) as { clip: ClipBrief }
      // Note: duplicate 只复制 name，brief 字段走 DEFAULT_BRIEF（DESIGN §11.10）
      router.push(`/clip/${data.clip.id}`)
    }
  }

  function onToggleArchived(inc: boolean) {
    setIncludeArchived(inc)
    startTransition(() => { void refresh(inc) })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-base font-medium">Clip Library · {clips.length} clips</h1>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => onToggleArchived(e.target.checked)}
            />
            包含已归档
          </label>
          <button
            onClick={() => { void onNew() }}
            className="rounded bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
          >
            + New clip
          </button>
        </div>
      </header>

      {error && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <main className="flex-1 overflow-auto p-4">
        {clips.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            还没有 clip，点击 [+ New clip] 创建第一个
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {clips.map((c) => (
              <ClipInstanceCard
                key={c.id}
                brief={c}
                onDuplicate={onDuplicate}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
