'use client'

import React from 'react'

interface FieldProps {
  label: string
  children: React.ReactNode
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="grid grid-cols-[80px_1fr] items-center gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{children}</div>
    </label>
  )
}
