'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief, InspectorScope } from '@/lib/demo/types'
import { DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF } from '@/lib/demo/defaults'
import { BRANDS } from '@/lib/editor/brand-mock'
import { ThemeProvider } from './ThemeProvider'
import { TopBar } from './TopBar'
import { LeftRail } from './LeftRail'
import { LeftSidebar } from './LeftSidebar'
import { CanvasStage } from './CanvasStage'
import { Inspector } from './Inspector'
import { BottomTimeline } from './BottomTimeline'

export function DemoApp() {
  const [brand, setBrand] = React.useState<DemoBrandState>(DEFAULT_DEMO_BRAND)
  const [brief, setBrief] = React.useState<DemoBrief>(DEFAULT_DEMO_BRIEF)
  const [scope, setScope] = React.useState<InspectorScope>('cover')

  function applyBrandPreset(id: string) {
    const preset = BRANDS.find((b) => b.id === id)
    if (!preset) return
    setBrand({ ...preset, fontPreset: brand.fontPreset })
  }

  return (
    <ThemeProvider>
      <div
        className="grid h-screen w-screen grid-rows-[48px_minmax(0,1fr)_96px] overflow-hidden bg-app text-text-hi"
        data-testid="demo-root"
        data-state="ready"
      >
        <TopBar scope={scope} />
        <main
          className="grid min-h-0 grid-cols-[64px_240px_minmax(0,1fr)_300px] overflow-hidden"
          data-testid="demo-main"
        >
          <LeftRail scope={scope} onChange={setScope} />
          <LeftSidebar brand={brand} onBrandPreset={applyBrandPreset} />
          <CanvasStage brand={brand} brief={brief} />
          <Inspector
            scope={scope}
            brand={brand}
            brief={brief}
            onBrandChange={setBrand}
            onBriefChange={setBrief}
          />
        </main>
        <BottomTimeline />
      </div>
    </ThemeProvider>
  )
}
