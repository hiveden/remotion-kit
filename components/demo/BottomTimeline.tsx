'use client'

import React from 'react'
import { DEMO_FPS, DEMO_DURATION_FRAMES, DEMO_FRAMES } from '@/lib/demo/defaults'

const TOTAL_SECONDS = DEMO_DURATION_FRAMES / DEMO_FPS

type Scope = 'cover' | 'body' | 'cta'

interface Props {
  activeScope: Scope | null
  onSegmentClick: (scope: Scope) => void
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = (seconds - m * 60).toFixed(1)
  return `${m}:${s.padStart(4, '0')}`
}

const SEGMENTS: ReadonlyArray<{
  scope: Scope
  label: string
  durationFrames: number
  bg: string
}> = [
  {
    scope: 'cover',
    label: 'Cover',
    durationFrames: DEMO_FRAMES.cover,
    bg: 'linear-gradient(90deg, #A855F7, #9333EA)',
  },
  {
    scope: 'body',
    label: 'Body',
    durationFrames: DEMO_FRAMES.body,
    bg: 'linear-gradient(90deg, #3B82F6, #2563EB)',
  },
  {
    scope: 'cta',
    label: 'CTA',
    durationFrames: DEMO_FRAMES.cta,
    bg: 'linear-gradient(90deg, #EC4899, #DB2777)',
  },
]

export function BottomTimeline({ activeScope, onSegmentClick }: Props) {
  return (
    <footer
      className="grid grid-cols-[160px_minmax(0,1fr)_160px] items-center gap-4 border-t border-border bg-panel px-4 shadow-panel transition-colors duration-200"
      data-testid="demo-timeline"
      data-active-segment={activeScope ?? 'none'}
    >
      <div className="flex h-full flex-col justify-center text-[11px] text-text-md">
        <span className="font-medium text-text-hi">时间轴</span>
        <span className="mt-0.5 font-mono text-[10px] text-text-lo" data-testid="timeline-meta">
          {TOTAL_SECONDS.toFixed(1)}s · {DEMO_FPS}fps · {DEMO_DURATION_FRAMES}f
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div
          className="flex h-7 w-full overflow-hidden rounded-md"
          role="tablist"
          aria-label="段位时间轴"
        >
          {SEGMENTS.map((seg) => {
            const pct = (seg.durationFrames / DEMO_DURATION_FRAMES) * 100
            const isActive = seg.scope === activeScope
            return (
              <button
                key={seg.scope}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSegmentClick(seg.scope)}
                title={`${seg.label} · ${(seg.durationFrames / DEMO_FPS).toFixed(1)}s · 点击跳到该段参数`}
                className={
                  'flex h-full items-center justify-center font-mono text-[10px] text-white transition-[transform,filter,box-shadow] duration-150 ' +
                  (isActive
                    ? 'scale-y-110 shadow-pop ring-2 ring-white/40 ring-offset-0'
                    : 'opacity-90 hover:scale-y-105 hover:opacity-100 motion-reduce:hover:scale-y-100')
                }
                style={{
                  width: `${pct}%`,
                  background: seg.bg,
                }}
                data-testid={`timeline-seg-${seg.scope}`}
                data-state={isActive ? 'active' : 'inactive'}
              >
                {seg.label} · {(seg.durationFrames / DEMO_FPS).toFixed(1)}s
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-text-lo">
          <span>0:00</span>
          <span>{fmt(TOTAL_SECONDS / 2)}</span>
          <span>{fmt(TOTAL_SECONDS)}</span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 font-mono text-[11px] text-text-md">
        <span className="text-text-hi">▶</span>
        <span className="text-text-hi">0:00.0</span>
        <span className="text-text-lo">/</span>
        <span>{fmt(TOTAL_SECONDS)}</span>
      </div>
    </footer>
  )
}
