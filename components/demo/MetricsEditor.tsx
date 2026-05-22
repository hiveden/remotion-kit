'use client'

import React from 'react'
import type { DemoCoverMetric } from '@/lib/demo/types'
import { Cross } from './icons'

interface Props {
  metrics: DemoCoverMetric[]
  onChange: (next: DemoCoverMetric[]) => void
}

const MAX = 3

export function MetricsEditor({ metrics, onChange }: Props) {
  function updateAt(i: number, patch: Partial<DemoCoverMetric>) {
    onChange(metrics.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  }
  function removeAt(i: number) {
    onChange(metrics.filter((_, idx) => idx !== i))
  }
  function add() {
    if (metrics.length >= MAX) return
    onChange([...metrics, { value: '', label: '' }])
  }

  const state = metrics.length === 0 ? 'empty' : metrics.length >= MAX ? 'full' : 'partial'

  return (
    <div className="space-y-1.5" data-testid="cover-metrics" data-state={state}>
      {metrics.map((m, i) => (
        <div key={i} className="flex items-center gap-1.5" data-testid={`cover-metric-${i}`}>
          <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
          <input
            type="text"
            value={m.value}
            placeholder="value"
            onChange={(e) => updateAt(i, { value: e.target.value })}
            className="w-16 rounded border border-input bg-card px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid={`cover-metric-${i}-value`}
          />
          <input
            type="text"
            value={m.label}
            placeholder="label"
            onChange={(e) => updateAt(i, { label: e.target.value })}
            className="flex-1 rounded border border-input bg-card px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid={`cover-metric-${i}-label`}
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="删除数据点"
            data-testid={`cover-metric-${i}-remove`}
          >
            <Cross className="h-3 w-3" />
          </button>
        </div>
      ))}
      {metrics.length < MAX ? (
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-input py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          data-testid="cover-metric-add"
          data-state="enabled"
        >
          + 添加数据点（剩 {MAX - metrics.length}）
        </button>
      ) : (
        <p className="text-xs text-muted-foreground" data-testid="cover-metric-cap">
          已达上限（{MAX} 个，认知阈值）
        </p>
      )}
    </div>
  )
}
