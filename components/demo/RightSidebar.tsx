'use client'

import React from 'react'
import type { AgentDockHandle } from './AgentChatDock'
import type { DemoBrandState, DemoBrief, DemoLayout, ParamScope } from '@/lib/demo/types'
import { ParamSection } from './ParamSection'
import { AgentChatDock } from './AgentChatDock'

interface Props {
  layout: DemoLayout
  brand: DemoBrandState
  brief: DemoBrief
  onBrandChange: (next: DemoBrandState) => void
  onBriefChange: (next: DemoBrief) => void
  onAgentSubmit: (prompt: string) => Promise<void>
  onAgentCancel: () => void
  dockRef: React.RefObject<AgentDockHandle | null>
}

const SCOPES: readonly ParamScope[] = ['brand', 'cover', 'body', 'cta']

export function RightSidebar({
  layout,
  brand,
  brief,
  onBrandChange,
  onBriefChange,
  onAgentSubmit,
  onAgentCancel,
  dockRef,
}: Props) {
  const open = layout === 'L1'
  return (
    <aside
      className={
        'flex h-full flex-col border-l border-border bg-panel transition-[opacity,transform] duration-300 ' +
        (open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0')
      }
      data-testid="demo-rightside"
      data-state={open ? 'open' : 'closed'}
      aria-hidden={!open}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...((!open ? { inert: '' } : {}) as any)}
    >
      <div className="flex-1 overflow-y-auto" data-testid="rightside-params">
        {SCOPES.map((scope) => (
          <ParamSection
            key={scope}
            scope={scope}
            brand={brand}
            brief={brief}
            onBrandChange={onBrandChange}
            onBriefChange={onBriefChange}
          />
        ))}
      </div>
      <AgentChatDock ref={dockRef} onSubmit={onAgentSubmit} onCancel={onAgentCancel} />
    </aside>
  )
}
