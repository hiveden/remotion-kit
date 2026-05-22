'use client'

import React from 'react'
import { TemplatesIcon, BrandIcon, Assets, Elements, Effects } from './icons'

export type RailMode = 'templates' | null

interface Props {
  mode: RailMode
  onChange: (next: RailMode) => void
}

type RailItemId = 'templates' | 'brand' | 'assets' | 'elements' | 'effects'

interface RailItem {
  id: RailItemId
  label: string
  Icon: React.FC<React.SVGProps<SVGSVGElement>>
  available: boolean
}

const ITEMS: ReadonlyArray<RailItem> = [
  { id: 'templates', label: '模板', Icon: TemplatesIcon, available: true },
  { id: 'brand', label: '品牌', Icon: BrandIcon, available: false },
  { id: 'assets', label: '素材', Icon: Assets, available: false },
  { id: 'elements', label: '元素', Icon: Elements, available: false },
  { id: 'effects', label: '特效', Icon: Effects, available: false },
]

export function LeftRail({ mode, onChange }: Props) {
  function handleClick(id: RailItemId) {
    if (id !== 'templates') return // placeholders are disabled
    onChange(mode === 'templates' ? null : 'templates')
  }
  return (
    <nav
      className="flex flex-col gap-1 border-r border-border bg-panel py-2 transition-colors duration-200"
      data-testid="demo-leftrail"
    >
      {ITEMS.map((item) => {
        const active = item.available && mode === item.id
        const disabled = !item.available
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            disabled={disabled}
            aria-disabled={disabled}
            aria-pressed={item.available ? active : undefined}
            aria-label={item.label + (disabled ? '（即将推出）' : '')}
            title={disabled ? `${item.label}（即将推出）` : item.label}
            className={
              'relative mx-2 flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-md transition-colors duration-150 ' +
              (disabled
                ? 'cursor-not-allowed text-text-lo opacity-50'
                : active
                  ? 'bg-elevated text-text-hi'
                  : 'text-text-md hover:bg-elevated hover:text-text-hi')
            }
            data-testid={`leftrail-${item.id}`}
            data-state={
              disabled ? 'disabled' : active ? 'active' : 'inactive'
            }
          >
            {active && (
              <span
                aria-hidden
                className="absolute -left-2 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r bg-primary"
              />
            )}
            <item.Icon className="h-5 w-5" />
            <span className="text-[9px]">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
