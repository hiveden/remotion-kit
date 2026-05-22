'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief, DemoLayout } from '@/lib/demo/types'
import { DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF } from '@/lib/demo/defaults'
import { ThemeProvider } from './ThemeProvider'
import { TopBar } from './TopBar'
import { LeftSidebar } from './LeftSidebar'
import { CanvasStage } from './CanvasStage'
import { RightSidebar } from './RightSidebar'
import { useAgentGenerate } from './useAgentGenerate'
import type { AgentDockHandle } from './AgentChatDock'

const L0_COLS = '280px minmax(0, 1fr) 0px'
const L1_COLS = '180px minmax(0, 1fr) 340px'

export function DemoApp() {
  const [layout, setLayout] = React.useState<DemoLayout>('L0')
  const [brand, setBrand] = React.useState<DemoBrandState>(DEFAULT_DEMO_BRAND)
  const [brief, setBrief] = React.useState<DemoBrief>(DEFAULT_DEMO_BRIEF)
  const dockRef = React.useRef<AgentDockHandle>(null)
  const agent = useAgentGenerate({
    brand,
    brief,
    dockRef,
    // After a successful generate, collapse the side panel so it's obvious that
    // AI now drives the canvas (Designer §3a / PM §5).
    onGenerated: () => setLayout('L0'),
  })

  return (
    <ThemeProvider>
      <div
        className="grid h-screen w-screen overflow-hidden bg-app text-text-hi"
        style={{ gridTemplateRows: '48px minmax(0, 1fr)' }}
        data-testid="demo-root"
        data-state="ready"
        data-layout={layout}
      >
        <TopBar
          layout={layout}
          onLayoutChange={setLayout}
          templateLabel="brief 系列"
          aiGenerated={agent.aiGenerated}
          onUndo={agent.undo}
        />
        <main
          className="grid min-h-0 overflow-hidden transition-[grid-template-columns] duration-300"
          style={{
            gridTemplateColumns: layout === 'L1' ? L1_COLS : L0_COLS,
            gridTemplateRows: 'minmax(0, 1fr)',
          }}
          data-testid="demo-main"
        >
          <LeftSidebar layout={layout} />
          <CanvasStage
            brand={brand}
            brief={brief}
            onBrandChange={setBrand}
            source={agent.source}
            reloadKey={agent.reloadKey}
          />
          <RightSidebar
            layout={layout}
            brand={brand}
            brief={brief}
            onBrandChange={setBrand}
            onBriefChange={setBrief}
            onAgentSubmit={agent.submit}
            onAgentCancel={agent.cancel}
            dockRef={dockRef}
          />
        </main>
      </div>
    </ThemeProvider>
  )
}
