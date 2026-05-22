'use client'

import React from 'react'
import type { InspectorScope } from '@/lib/demo/types'
import { BrandIcon, CoverIcon, BodyIcon, CtaIcon } from './icons'

interface Props {
  scope: InspectorScope
  onChange: (scope: InspectorScope) => void
}

interface RailItem {
  value: InspectorScope
  label: string
  Icon: React.FC<React.SVGProps<SVGSVGElement>>
}

const ITEMS: ReadonlyArray<RailItem> = [
  { value: 'brand', label: '品牌', Icon: BrandIcon },
  { value: 'cover', label: '封面', Icon: CoverIcon },
  { value: 'body', label: '内容', Icon: BodyIcon },
  { value: 'cta', label: '收尾', Icon: CtaIcon },
]

export function LeftRail({ scope, onChange }: Props) {
  return (
    <nav
      className="flex flex-col gap-1 border-r border-border bg-panel py-2 transition-colors duration-200"
      data-testid="demo-leftrail"
    >
      {ITEMS.map((item) => {
        const active = scope === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={
              'relative mx-2 flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-md text-text-lo transition-colors duration-150 hover:bg-elevated hover:text-text-hi ' +
              (active ? 'bg-elevated text-text-hi' : '')
            }
            data-testid={`leftrail-${item.value}`}
            data-state={active ? 'active' : 'inactive'}
            aria-pressed={active}
            aria-label={item.label}
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
