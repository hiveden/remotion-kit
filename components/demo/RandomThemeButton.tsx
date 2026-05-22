'use client'

import React from 'react'
import type { DemoBrandState } from '@/lib/demo/types'
import { randomThemePair } from '@/lib/demo/random-themes'

interface Props {
  brand: DemoBrandState
  onChange: (next: DemoBrandState) => void
}

export function RandomThemeButton({ brand, onChange }: Props) {
  const lastIdxRef = React.useRef(-1)
  function randomize() {
    const { pair, idx } = randomThemePair(lastIdxRef.current)
    lastIdxRef.current = idx
    onChange({
      ...brand,
      colors: {
        ...brand.colors,
        primary: pair.primary,
        secondary: pair.secondary,
      },
    })
  }
  return (
    <button
      type="button"
      onClick={randomize}
      className="group flex h-9 items-center gap-2 rounded-full border border-[color:rgba(168,85,247,0.4)] bg-[color:rgba(168,85,247,0.08)] px-4 text-[12px] font-medium text-primary transition-all duration-150 hover:border-[color:rgba(168,85,247,0.6)] hover:bg-[color:rgba(168,85,247,0.14)] hover:shadow-panel active:scale-95 motion-reduce:active:scale-100"
      data-testid="random-theme-button"
    >
      <span
        className="text-[16px] transition-transform duration-200 group-hover:rotate-[15deg] motion-reduce:group-hover:rotate-0"
        aria-hidden
      >
        🎲
      </span>
      <span>随机主题色</span>
    </button>
  )
}
