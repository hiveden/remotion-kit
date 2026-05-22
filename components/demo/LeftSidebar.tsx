'use client'

import React from 'react'
import { Check } from './icons'

interface Props {
  visible: boolean
}

const TEMPLATES = [
  { id: 'brief', label: '数据简报', subtitle: '9:16 抖音', active: true },
  { id: 'flash', label: 'Flash 快讯', subtitle: 'v0.3', active: false },
  { id: 'report', label: 'Report 长报告', subtitle: 'v0.3', active: false },
  { id: 'tutorial', label: 'Tutorial 教程', subtitle: 'v0.3', active: false },
  { id: 'core', label: 'Core 概念', subtitle: 'v0.3', active: false },
  { id: 'run', label: 'Run 实测', subtitle: 'v0.3', active: false },
] as const

export function LeftSidebar({ visible }: Props) {
  return (
    <aside
      className={
        'flex h-full flex-col overflow-y-auto border-r border-border bg-panel p-4 transition-opacity duration-200 ' +
        (visible ? 'opacity-100' : 'pointer-events-none opacity-0')
      }
      data-testid="demo-sidebar"
      data-state={visible ? 'open' : 'closed'}
      aria-hidden={!visible}
    >
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-text-md">
        <span aria-hidden className="h-4 w-1 rounded-sm bg-primary" />
        模板
      </h2>
      <div className="grid grid-cols-2 gap-3" data-testid="sidebar-templates">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.active}
            aria-disabled={!t.active}
            className={
              'group relative flex flex-col gap-1.5 rounded-md border p-1.5 text-left transition-all duration-150 ' +
              (t.active
                ? 'cursor-pointer border-primary bg-[color:rgba(168,85,247,0.04)] shadow-panel ring-2 ring-[color:rgba(168,85,247,0.25)]'
                : 'pointer-events-none cursor-default select-none border-dashed border-border bg-panel opacity-60')
            }
            data-testid={`template-card-${t.id}`}
            data-state={t.active ? 'active' : 'placeholder'}
          >
            <div className="relative aspect-[9/12] w-full overflow-hidden rounded bg-canvas shadow-panel">
              {t.active ? (
                <div
                  className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1A0E22] via-[#160a1e] to-[#0E0E12] font-mono text-[10px] text-text-md"
                  aria-hidden
                >
                  brief preview
                </div>
              ) : (
                <div
                  className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2a2a30] to-[#0e0e12] font-mono text-[9px] text-text-lo"
                  aria-hidden
                >
                  coming soon
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-1">
              {t.active && <Check className="h-2.5 w-2.5 shrink-0 text-primary" aria-hidden />}
              <span
                className={
                  'truncate text-[11px] ' +
                  (t.active ? 'font-medium text-text-hi' : 'text-text-lo')
                }
              >
                {t.label}
              </span>
              {!t.active && (
                <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-text-lo">
                  {t.subtitle}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
