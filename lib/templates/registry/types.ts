// lib/templates/registry/types.ts
//
// Component registry: three segment-specific registries (Cover / Body / CTA)
// hold the bundled component variants. Each entry declares its metadata +
// rendered React component. The renderer (composition.tsx) looks up entries
// by `componentType` set on the brief.

import type React from 'react'
import type { DemoBrandState, DemoBrief } from '@/lib/demo/types'

export type SegmentRole = 'cover' | 'body' | 'cta'

export type ComponentDensity = 'low' | 'medium' | 'high'
export type ComponentMotion = 'static' | 'subtle' | 'expressive'
export type ComponentPalette = 'mono' | 'duo' | 'multi'

export interface ComponentAesthetic {
  density: ComponentDensity
  motion: ComponentMotion
  palette: ComponentPalette
}

export interface BrandConstraints {
  /** Brand fields this component absolutely needs. */
  requires?: ReadonlyArray<keyof DemoBrandState | 'colors'>
  /** Brand fields the component uses if present but tolerates missing. */
  optional?: ReadonlyArray<keyof DemoBrandState | 'colors'>
  /** Brand fields the component ignores entirely. */
  ignores?: ReadonlyArray<keyof DemoBrandState | 'colors'>
}

export type ElementKind = 'font-preset' | 'enum' | 'boolean' | 'number' | 'color' | 'text'

export interface ElementSchemaField {
  key: string
  label: string
  kind: ElementKind
  enumValues?: ReadonlyArray<string>
  min?: number
  max?: number
}

export interface ComponentMetadata {
  id: string
  name: string
  description: string
  tags: ReadonlyArray<string>
  aesthetic: ComponentAesthetic
  brandConstraints: BrandConstraints
  elementsDefaults: Readonly<Record<string, unknown>>
  elementsSchema: ReadonlyArray<ElementSchemaField>
  previewUrl?: string
}

export interface SegmentProps {
  brand: DemoBrandState
  brief: DemoBrief
  /** Resolved elements (registry defaults merged with brief overrides). */
  elements: Readonly<Record<string, unknown>>
}

export interface ComponentEntry {
  metadata: ComponentMetadata
  Component: React.FC<SegmentProps>
}

export class Registry {
  private readonly role: SegmentRole
  private readonly entries: Map<string, ComponentEntry> = new Map()
  private defaultId: string | null = null

  constructor(role: SegmentRole) {
    this.role = role
  }

  register(entry: ComponentEntry, opts: { default?: boolean } = {}): void {
    const expectedPrefix = `${this.role}/`
    if (!entry.metadata.id.startsWith(expectedPrefix)) {
      throw new Error(
        `Registry(${this.role}).register: id ${JSON.stringify(entry.metadata.id)} must start with "${expectedPrefix}"`,
      )
    }
    if (this.entries.has(entry.metadata.id)) {
      throw new Error(`Registry(${this.role}).register: duplicate id ${entry.metadata.id}`)
    }
    this.entries.set(entry.metadata.id, entry)
    if (opts.default || this.defaultId === null) {
      this.defaultId = entry.metadata.id
    }
  }

  lookup(id: string): ComponentEntry | null {
    return this.entries.get(id) ?? null
  }

  /** Lookup with default fallback. Throws if registry is empty (caller bug). */
  lookupOrDefault(id?: string): ComponentEntry {
    if (id) {
      const hit = this.entries.get(id)
      if (hit) return hit
    }
    if (this.defaultId) {
      const fallback = this.entries.get(this.defaultId)
      if (fallback) return fallback
    }
    throw new Error(`Registry(${this.role}).lookupOrDefault: registry is empty`)
  }

  /** All entries in registration order. */
  list(): ReadonlyArray<ComponentEntry> {
    return Array.from(this.entries.values())
  }

  /** All metadata only (cheap for menus / variant pickers). */
  metadata(): ReadonlyArray<ComponentMetadata> {
    return this.list().map((e) => e.metadata)
  }

  defaultEntryId(): string | null {
    return this.defaultId
  }
}
