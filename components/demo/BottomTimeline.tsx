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
    <div
      className="flex h-20 w-full max-w-[480px] flex-col justify-center gap-2 rounded-md border border-border bg-panel px-4 py-3 shadow-panel transition-colors duration-200"
      data-testid="demo-timeline"
    >
      <div className="flex h-4 w-full overflow-hidden rounded-sm">
        <div
          className="h-full bg-gradient-to-r from-[#A855F7] to-[#9333EA]"
          style={{ width: `${coverPct}%` }}
          title={`Cover · ${(DEMO_FRAMES.cover / DEMO_FPS).toFixed(1)}s`}
          aria-label="Cover segment"
        />
        <div
          className="h-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB]"
          style={{ width: `${bodyPct}%` }}
          title={`Body · ${(DEMO_FRAMES.body / DEMO_FPS).toFixed(1)}s`}
          aria-label="Body segment"
        />
        <div
          className="h-full bg-gradient-to-r from-[#EC4899] to-[#DB2777]"
          style={{ width: `${ctaPct}%` }}
          title={`CTA · ${(DEMO_FRAMES.cta / DEMO_FPS).toFixed(1)}s`}
          aria-label="CTA segment"
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[10px] text-text-lo">
        <span>0:00</span>
        <span data-testid="timeline-meta">
          {TOTAL_SECONDS.toFixed(1)}s · {DEMO_FPS}fps · {DEMO_DURATION_FRAMES}f
        </span>
        <span>{fmt(TOTAL_SECONDS)}</span>
      </div>
    </div>
  )
}
