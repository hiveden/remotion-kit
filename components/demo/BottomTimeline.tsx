'use client'

import React from 'react'
import { DEMO_FPS, DEMO_DURATION_FRAMES, DEMO_FRAMES } from '@/lib/demo/defaults'

const TOTAL_SECONDS = DEMO_DURATION_FRAMES / DEMO_FPS

function fmt(seconds: number) {
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
      className="grid grid-cols-[160px_minmax(0,1fr)_160px] items-center gap-4 border-t border-border bg-panel px-4 shadow-panel transition-colors duration-200"
      data-testid="demo-timeline"
    >
      <div className="flex h-full flex-col justify-center text-[11px] text-text-md">
        <span className="font-medium text-text-hi">时间轴</span>
        <span className="mt-0.5 font-mono text-[10px] text-text-lo" data-testid="timeline-meta">
          {TOTAL_SECONDS.toFixed(1)}s · {DEMO_FPS}fps · {DEMO_DURATION_FRAMES}f
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex h-5 w-full overflow-hidden rounded-sm">
          <div
            className="flex h-full items-center justify-center font-mono text-[10px] text-white"
            style={{
              width: `${coverPct}%`,
              background: 'linear-gradient(90deg, #A855F7, #9333EA)',
            }}
            title={`Cover · ${(DEMO_FRAMES.cover / DEMO_FPS).toFixed(1)}s`}
            data-testid="timeline-seg-cover"
          >
            Cover {(DEMO_FRAMES.cover / DEMO_FPS).toFixed(1)}s
          </div>
          <div
            className="flex h-full items-center justify-center font-mono text-[10px] text-white"
            style={{
              width: `${bodyPct}%`,
              background: 'linear-gradient(90deg, #3B82F6, #2563EB)',
            }}
            title={`Body · ${(DEMO_FRAMES.body / DEMO_FPS).toFixed(1)}s`}
            data-testid="timeline-seg-body"
          >
            Body {(DEMO_FRAMES.body / DEMO_FPS).toFixed(1)}s
          </div>
          <div
            className="flex h-full items-center justify-center font-mono text-[10px] text-white"
            style={{
              width: `${ctaPct}%`,
              background: 'linear-gradient(90deg, #EC4899, #DB2777)',
            }}
            title={`CTA · ${(DEMO_FRAMES.cta / DEMO_FPS).toFixed(1)}s`}
            data-testid="timeline-seg-cta"
          >
            CTA {(DEMO_FRAMES.cta / DEMO_FPS).toFixed(1)}s
          </div>
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
