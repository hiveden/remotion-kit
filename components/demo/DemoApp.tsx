'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'
import { DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF } from '@/lib/demo/defaults'
import { Header } from './Header'
import { Panel } from './Panel'
import { Stage } from './Stage'

export function DemoApp() {
  const [brand, setBrand] = React.useState<DemoBrandState>(DEFAULT_DEMO_BRAND)
  const [brief, setBrief] = React.useState<DemoBrief>(DEFAULT_DEMO_BRIEF)

  return (
    <div className="flex h-screen flex-col" data-testid="demo-root" data-state="ready">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Panel brand={brand} brief={brief} onBrandChange={setBrand} onBriefChange={setBrief} />
        <Stage brand={brand} brief={brief} />
      </div>
    </div>
  )
}
