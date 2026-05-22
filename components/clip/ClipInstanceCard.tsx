// packages/video-gui/components/clip/ClipInstanceCard.tsx
//
// 列表 card：name + status badge + refs count；下排 aspect + platform + duration。
// 没有 template badge / brand dot。
//
// SSOT: DESIGN.md §4 card 内容

'use client'

import Link from 'next/link'
import type { ClipBrief } from '@/lib/editor/clip-instance'
import { formatRelativeTime } from './format-time'

interface Props {
  brief: ClipBrief
  onDuplicate: (id: string) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
}

export function ClipInstanceCard({ brief, onDuplicate, onArchive, onDelete }: Props) {
  return (
    <div className="group relative flex flex-col gap-2 rounded border bg-card p-3">
      <Link href={`/clip/${brief.id}`} className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">{brief.name}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              brief.status === 'archived'
                ? 'bg-muted text-muted-foreground'
                : 'bg-emerald-500/10 text-emerald-700'
            }`}
          >
            {brief.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
          <Chip>{brief.aspectRatio}</Chip>
          <Chip>{brief.publishPlatform}</Chip>
          <Chip>{brief.targetDuration}s</Chip>
          {brief.references.length > 0 && <Chip>+{brief.references.length} refs</Chip>}
        </div>
        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(brief.updatedAt)}</span>
      </Link>
      <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
        <IconBtn onClick={() => onDuplicate(brief.id)} label="复制">⎘</IconBtn>
        <IconBtn onClick={() => onArchive(brief.id, brief.status !== 'archived')} label="归档/取消归档">⊠</IconBtn>
        <IconBtn onClick={() => onDelete(brief.id)} label="删除">🗑</IconBtn>
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded border bg-background px-1.5 py-0.5">{children}</span>
}

function IconBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      title={label}
      className="h-6 w-6 rounded bg-background/80 text-xs hover:bg-accent"
    >
      {children}
    </button>
  )
}
