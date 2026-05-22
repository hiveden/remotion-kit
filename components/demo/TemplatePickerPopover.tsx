'use client'

import React from 'react'
import { Check } from './icons'

interface Props {
  open: boolean
  onClose: () => void
}

const PLACEHOLDERS = ['Flash 系列', 'Report 系列', 'Tutorial 系列', 'Core 系列']

export function TemplatePickerPopover({ open, onClose }: Props) {
  // Click-outside close + Escape close
  React.useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('[data-testid="template-picker-popover"]')) return
      if (target.closest('[data-testid="header-template-picker"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="absolute right-6 top-14 z-10 w-[480px] rounded-md border border-border bg-popover p-3 shadow-md"
      data-testid="template-picker-popover"
      data-state="open"
      role="dialog"
      aria-label="模板选择"
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex flex-col gap-2 rounded border-2 border-primary bg-card p-3 text-left hover:bg-accent"
          data-testid="template-card-brief"
          data-state="active"
        >
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            <span className="text-sm font-medium">Brief 系列</span>
          </div>
          <p className="text-xs text-muted-foreground">数据简报 · 9:16 抖音</p>
          <div className="aspect-[9/16] w-full rounded bg-stage" />
        </button>

        {PLACEHOLDERS.map((name, i) => (
          <div
            key={name}
            className="pointer-events-none flex select-none flex-col gap-2 rounded border border-dashed border-border bg-secondary/50 p-3 opacity-50"
            data-testid={`template-card-placeholder-${i}`}
            data-state="placeholder"
            aria-disabled="true"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{name}</span>
              <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                coming soon
              </span>
            </div>
            <div className="aspect-[9/16] w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
