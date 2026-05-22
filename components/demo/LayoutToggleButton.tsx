'use client'

import React from 'react'
import type { DemoLayout } from '@/lib/demo/types'
import { ChevronRight, ChevronLeft } from './icons'

interface Props {
  layout: DemoLayout
  onChange: (next: DemoLayout) => void
}

export function LayoutToggleButton({ layout, onChange }: Props) {
  function toggle() {
    onChange(layout === 'L0' ? 'L1' : 'L0')
  }
  const expanded = layout === 'L1'
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-7 items-center gap-1.5 rounded-full border border-border bg-panel px-3 text-[11px] font-medium text-text-md transition-colors duration-150 hover:border-border-strong hover:bg-input hover:text-text-hi"
      data-testid="topbar-layout-toggle"
      data-state={layout}
      aria-expanded={expanded}
      aria-label={expanded ? '收起侧栏' : '展开侧栏'}
    >
      {expanded ? (
        <>
          <ChevronLeft className="h-3 w-3" aria-hidden />
          <span>收起</span>
        </>
      ) : (
        <>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span>展开</span>
        </>
      )}
    </button>
  )
}
