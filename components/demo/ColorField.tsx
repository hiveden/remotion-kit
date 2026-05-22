'use client'

import React from 'react'

interface Props {
  value: string
  onChange: (next: string) => void
  testid?: string
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function ColorField({ value, onChange, testid }: Props) {
  const [draft, setDraft] = React.useState(value)
  React.useEffect(() => setDraft(value), [value])

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded border border-border-strong bg-transparent p-0"
        aria-label="颜色"
        data-testid={testid ? `${testid}-picker` : undefined}
      />
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const v = e.target.value
          setDraft(v)
          if (HEX_RE.test(v)) onChange(v)
        }}
        spellCheck={false}
        className="w-24 rounded border border-border-strong bg-input px-2 py-1 font-mono text-xs text-text-hi focus:border-primary focus:outline-none"
        data-testid={testid ? `${testid}-hex` : undefined}
      />
    </div>
  )
}
