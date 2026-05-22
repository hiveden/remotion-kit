'use client'

import React from 'react'
import { DEMO_FPS, DEMO_DURATION_FRAMES, DEMO_FRAMES } from '@/lib/demo/defaults'

const TOTAL_SECONDS = DEMO_DURATION_FRAMES / DEMO_FPS

function fmtSec(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = (seconds - m * 60).toFixed(1)
  return `${m}:${s.padStart(4, '0')}`
}

export function BottomTimeline() {
  const coverPct = (DEMO_FRAMES.cover / DEMO_DURATION_FRAMES) * 100
  const bodyPct = (DEMO_FRAMES.body / DEMO_DURATION_FRAMES) * 100
  const ctaPct = (DEMO_FRAMES.cta / DEMO_DURATION_FRAMES) * 100
  return (
    <footer
      className="grid grid-cols-[240px_1fr_200px] items-stretch border-t border-border bg-panel shadow-panel transition-colors duration-200"
      data-testid="demo-timeline"
    >
      <div className="border-r border-border px-4 py-3 text-xs text-text-md">
        <div className="font-medium text-text-hi">时间轴</div>
        <div
          className="mt-0.5 font-mono text-[10px] text-text-lo"
          data-testid="timeline-meta"
        >
          {TOTAL_SECONDS.toFixed(1)}s · {DEMO_FPS}fps · {DEMO_DURATION_FRAMES}f
        </div>
      </div>
      <div className="flex flex-col gap-1.5 overflow-x-auto px-4 py-3">
        <div className="flex h-[26px] items-center gap-1">
          <span className="w-12 font-mono text-[10px] text-text-lo">SEG</span>
          <div
            className="flex h-[22px] items-center rounded-sm px-2 font-mono text-[10px] text-white"
            style={{
              width: `${coverPct}%`,
              background: 'linear-gradient(90deg, var(--rk-primary), #9333ea)',
            }}
            data-testid="timeline-seg-cover"
          >
            Cover · {(DEMO_FRAMES.cover / DEMO_FPS).toFixed(1)}s
          </div>
          <div
            className="flex h-[22px] items-center rounded-sm px-2 font-mono text-[10px] text-white"
            style={{
              width: `${bodyPct}%`,
              background: 'linear-gradient(90deg, var(--rk-secondary), #2563eb)',
            }}
            data-testid="timeline-seg-body"
          >
            Body · {(DEMO_FRAMES.body / DEMO_FPS).toFixed(1)}s
          </div>
          <div
            className="flex h-[22px] items-center rounded-sm px-2 font-mono text-[10px] text-white"
            style={{
              width: `${ctaPct}%`,
              background: 'linear-gradient(90deg, #ec4899, #db2777)',
            }}
            data-testid="timeline-seg-cta"
          >
            CTA · {(DEMO_FRAMES.cta / DEMO_FPS).toFixed(1)}s
          </div>
        </div>
        <div className="flex h-[26px] items-center gap-1">
          <span className="w-12 font-mono text-[10px] text-text-lo">BG</span>
          <div className="h-[22px] flex-1 rounded-sm border border-border bg-elevated px-2 py-1 font-mono text-[10px] text-text-md">
            渐变 + 三段过渡
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-l border-border px-4 py-3 font-mono text-[11px] text-text-md">
        <span className="text-text-hi">▶</span>
        <span className="text-text-hi">0:00.0</span>
        <span className="text-text-lo">/</span>
        <span>{fmtSec(TOTAL_SECONDS)}</span>
      </div>
    </footer>
  )
}
