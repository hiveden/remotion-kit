'use client'

import React from 'react'
import type { DemoBrandState, DemoBrief, DemoLayout } from '@/lib/demo/types'
import { DEFAULT_DEMO_BRAND, DEFAULT_DEMO_BRIEF } from '@/lib/demo/defaults'
import { ThemeProvider } from './ThemeProvider'
import { TopBar } from './TopBar'
import { LeftRail, type RailMode } from './LeftRail'
import { LeftSidebar } from './LeftSidebar'
import { CanvasStage } from './CanvasStage'
import { RightSidebar } from './RightSidebar'
import { BottomTimeline } from './BottomTimeline'
import { useAgentGenerate } from './useAgentGenerate'
import { ChevronLeft, ChevronRight } from './icons'
import type { AgentDockHandle } from './AgentChatDock'

const RAIL = 56
const SIDEBAR = 240
const RIGHT = 340

export function DemoApp() {
  const [layout, setLayout] = React.useState<DemoLayout>('L0')
  const [railMode, setRailMode] = React.useState<RailMode>('templates')
  const [brand, setBrand] = React.useState<DemoBrandState>(DEFAULT_DEMO_BRAND)
  const [brief, setBrief] = React.useState<DemoBrief>(DEFAULT_DEMO_BRIEF)
  const dockRef = React.useRef<AgentDockHandle>(null)
  const agent = useAgentGenerate({
    brand,
    brief,
    dockRef,
    onGenerated: () => setLayout('L0'),
  })

  const sidebarWidth = railMode === 'templates' ? SIDEBAR : 0
  const rightWidth = layout === 'L1' ? RIGHT : 0
  const cols = `${RAIL}px ${sidebarWidth}px minmax(0, 1fr) ${rightWidth}px`

  function toggleLayout() {
    setLayout(layout === 'L1' ? 'L0' : 'L1')
  }

  return (
    <ThemeProvider>
      <div
        className="relative grid h-screen w-screen overflow-hidden bg-app text-text-hi"
        style={{ gridTemplateRows: '48px minmax(0, 1fr) 80px' }}
        data-testid="demo-root"
        data-state="ready"
        data-layout={layout}
        data-rail={railMode ?? 'closed'}
      >
        <TopBar
          templateLabel="brief 系列"
          aiGenerated={agent.aiGenerated}
          onUndo={agent.undo}
        />
        <main
          className="grid min-h-0 overflow-hidden transition-[grid-template-columns] duration-300"
          style={{
            gridTemplateColumns: cols,
            gridTemplateRows: 'minmax(0, 1fr)',
          }}
          data-testid="demo-main"
        >
          <LeftRail mode={railMode} onChange={setRailMode} />
          <LeftSidebar visible={railMode === 'templates'} />
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
        <BottomTimeline />
        {/* Right-pane toggle handle: floats on the seam between Stage and the
            right column. When collapsed (L0, rightWidth=0) it sits on the
            viewport right edge; when expanded (L1) it sits 14px to the left
            of the right column boundary so it visually hangs off the panel. */}
        <button
          type="button"
          onClick={toggleLayout}
          className="pointer-events-auto absolute z-30 grid h-8 w-8 place-items-center rounded-full border border-border bg-panel text-text-md shadow-pop transition-[right,colors] duration-300 hover:border-border-strong hover:bg-input hover:text-text-hi"
          style={{
            top: 64,
            right: Math.max(rightWidth - 16, 0),
          }}
          aria-label={layout === 'L1' ? '收起右栏' : '展开右栏'}
          aria-expanded={layout === 'L1'}
          title={layout === 'L1' ? '收起右栏' : '展开右栏'}
          data-testid="rightside-toggle"
          data-state={layout}
        >
          {layout === 'L1' ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </ThemeProvider>
  )
}
