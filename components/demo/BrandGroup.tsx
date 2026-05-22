'use client'

import React from 'react'
import { BRANDS } from '@/lib/editor/brand-mock'
import type { DemoBrandState, FontPreset } from '@/lib/demo/types'
import { Field } from './Field'
import { ColorField } from './ColorField'
import { SegmentedControl } from './SegmentedControl'

interface Props {
  brand: DemoBrandState
  onChange: (next: DemoBrandState) => void
}

const FONT_PRESETS: ReadonlyArray<{ value: FontPreset; label: string }> = [
  { value: 'compact', label: '紧凑' },
  { value: 'comfortable', label: '舒展' },
  { value: 'spacious', label: '宽松' },
]

export function BrandGroup({ brand, onChange }: Props) {
  function setBrandFromPreset(id: string) {
    const preset = BRANDS.find((b) => b.id === id)
    if (!preset) return
    onChange({ ...preset, fontPreset: brand.fontPreset })
  }

  return (
    <section className="border-b border-border px-5 py-4" data-testid="brand-group">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider">
        <span className="h-4 w-1 rounded-sm bg-primary" />
        Brand
      </h2>

      <Field label="预设">
        <select
          value={brand.id}
          onChange={(e) => setBrandFromPreset(e.target.value)}
          className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="brand-preset"
        >
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="品牌名">
        <input
          type="text"
          value={brand.name}
          onChange={(e) => onChange({ ...brand, name: e.target.value })}
          className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="brand-name"
        />
      </Field>

      <Field label="主色">
        <ColorField
          value={brand.colors.primary}
          onChange={(primary) => onChange({ ...brand, colors: { ...brand.colors, primary } })}
          testid="brand-primary"
        />
      </Field>

      <Field label="副色">
        <ColorField
          value={brand.colors.secondary ?? '#3B82F6'}
          onChange={(secondary) => onChange({ ...brand, colors: { ...brand.colors, secondary } })}
          testid="brand-secondary"
        />
      </Field>

      <Field label="Logo 文字">
        <input
          type="text"
          value={brand.logo.text ?? ''}
          onChange={(e) =>
            onChange({ ...brand, logo: { ...brand.logo, type: 'text', text: e.target.value } })
          }
          className="w-full rounded border border-input bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="brand-logo-text"
        />
      </Field>

      <Field label="字体">
        <SegmentedControl
          options={FONT_PRESETS}
          value={brand.fontPreset}
          onChange={(fontPreset) => onChange({ ...brand, fontPreset })}
          testid="brand-font-preset"
        />
      </Field>
    </section>
  )
}
