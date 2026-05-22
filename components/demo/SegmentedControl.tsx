'use client'

import React from 'react'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: ReadonlyArray<Option<T>>
  value: T
  onChange: (v: T) => void
  testid?: string
}

export function SegmentedControl<T extends string>({ options, value, onChange, testid }: Props<T>) {
  return (
    <div className="inline-flex rounded border border-border bg-secondary p-0.5">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'rounded px-2.5 py-1 text-xs transition motion-reduce:transition-none ' +
              (active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground')
            }
            data-testid={testid ? `${testid}-${opt.value}` : undefined}
            data-state={active ? 'active' : 'inactive'}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
