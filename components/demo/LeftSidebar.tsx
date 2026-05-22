'use client'

import React from 'react'
import { BRANDS } from '@/lib/editor/brand-mock'
import type { DemoBrandState } from '@/lib/demo/types'
import { Check } from './icons'

interface Props {
  brand: DemoBrandState
  onBrandPreset: (id: string) => void
}

const TEMPLATES = [
  { id: 'brief', label: '数据简报', active: true },
  { id: 'flash', label: 'Flash 快讯', active: false },
  { id: 'report', label: 'Report 长报告', active: false },
  { id: 'tutorial', label: 'Tutorial 教程', active: false },
  { id: 'core', label: 'Core 概念', active: false },
  { id: 'run', label: 'Run 实测', active: false },
]

const BRAND_SWATCHES: Record<string, string[]> = {
  default: ['#A855F7', '#3B82F6'],
  'ml-track': ['#3B82F6', '#10B981'],
  tutorial: ['#F59E0B', '#EF4444'],
}

export function LeftSidebar({ brand, onBrandPreset }: Props) {
  return (
    <aside
      className="flex h-full flex-col overflow-y-auto border-r border-border bg-panel transition-colors duration-200"
      data-testid="demo-sidebar"
    >
      <section className="px-4 pb-2 pt-3">
        <div className="text-[13px] font-semibold text-text-hi">三段式模板</div>
        <div className="mt-0.5 text-[11px] text-text-lo">v0.1 仅 brief 系列</div>
      </section>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3" data-testid="sidebar-templates">
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            className={
              'relative aspect-[9/16] overflow-hidden rounded-md border text-[10px] transition-colors ' +
              (t.active
                ? 'cursor-pointer border-primary bg-canvas text-text-md hover:border-primary'
                : 'pointer-events-none cursor-not-allowed border-dashed border-border bg-canvas/40 text-text-lo opacity-50')
            }
            data-testid={`sidebar-template-${t.id}`}
            data-state={t.active ? 'active' : 'placeholder'}
            aria-disabled={!t.active}
          >
            <div className="grid h-full place-items-center bg-gradient-to-br from-[#1A0E22] to-[#0E0E12] font-mono text-text-lo">
              {t.label}
            </div>
            {t.active ? (
              <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded bg-black/70 py-0.5 text-text-md">
                <Check className="h-3 w-3 text-primary" />
                {t.label}
              </div>
            ) : (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-0.5 font-mono text-[9px] text-text-lo">
                coming soon
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="border-t border-border-soft px-4 pb-2 pt-3">
        <div className="text-[13px] font-semibold text-text-hi">Brand 配置</div>
        <div className="mt-0.5 text-[11px] text-text-lo">3 个 brand kit 可切换</div>
      </section>
      <div className="flex flex-col gap-1.5 px-4 pb-4" data-testid="sidebar-brand-list">
        {BRANDS.map((b) => {
          const active = brand.id === b.id
          const colors = BRAND_SWATCHES[b.id] ?? ['#A855F7', '#3B82F6']
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onBrandPreset(b.id)}
              className={
                'flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors ' +
                (active
                  ? 'border-primary bg-elevated text-text-hi'
                  : 'border-border bg-elevated/40 text-text-md hover:border-border-strong hover:text-text-hi')
              }
              data-testid={`sidebar-brand-${b.id}`}
              data-state={active ? 'active' : 'inactive'}
            >
              <span
                aria-hidden
                className="h-4 w-4 rounded"
                style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
              />
              <span className="text-xs">{b.name}</span>
              {active && (
                <span className="ml-auto text-[10px] text-primary" aria-hidden>
                  ●
                </span>
              )}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
