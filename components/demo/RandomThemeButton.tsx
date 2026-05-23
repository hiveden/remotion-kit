'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import { rollEverything } from '@/lib/demo/random-roll'

interface Props {
  brand: DemoBrandState
  brief: DemoBrief
  onChange: (next: { brand: DemoBrandState; brief: DemoBrief }) => void
}

export function RandomThemeButton({ brand, brief, onChange }: Props) {
  const lastIdxRef = React.useRef(-1)
  function randomize() {
    const result = rollEverything(brand, brief, lastIdxRef.current)
    lastIdxRef.current = result.pairIdx
    onChange({ brand: result.brand, brief: result.brief })
  }
  return (
    <button
      type="button"
      onClick={randomize}
      className="group flex h-9 items-center gap-2 rounded-full border border-[color:rgba(168,85,247,0.4)] bg-[color:rgba(168,85,247,0.08)] px-4 text-[12px] font-medium text-primary transition-all duration-150 hover:border-[color:rgba(168,85,247,0.6)] hover:bg-[color:rgba(168,85,247,0.14)] hover:shadow-panel active:scale-95 motion-reduce:active:scale-100"
      data-testid="random-theme-button"
      title="随机色板 + 段位变体 + 元素维度"
    >
      <span
        className="text-[16px] transition-transform duration-200 group-hover:rotate-[15deg] motion-reduce:group-hover:rotate-0"
        aria-hidden
      >
        🎲
      </span>
      <span>随机一切</span>
    </button>
  )
}
