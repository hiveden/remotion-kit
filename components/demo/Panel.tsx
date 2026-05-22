'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import { BrandGroup } from './BrandGroup'
import { ContentGroup } from './ContentGroup'

interface Props {
  brand: DemoBrandState
  brief: DemoBrief
  onBrandChange: (next: DemoBrandState) => void
  onBriefChange: (next: DemoBrief) => void
}

export function Panel({ brand, brief, onBrandChange, onBriefChange }: Props) {
  return (
    <aside
      className="flex h-[calc(100vh-56px)] w-[420px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card"
      data-testid="demo-panel"
    >
      <BrandGroup brand={brand} onChange={onBrandChange} />
      <ContentGroup brief={brief} onChange={onBriefChange} />
    </aside>
  )
}
