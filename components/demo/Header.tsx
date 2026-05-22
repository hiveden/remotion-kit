'use client'

import React from 'react'
import { ChevronDown, GitHubMark } from './icons'
import { TemplatePickerPopover } from './TemplatePickerPopover'

const REPO_URL = 'https://github.com/hiveden/remotion-kit'

export function Header() {
  const [pickerOpen, setPickerOpen] = React.useState(false)

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-border bg-card px-6" data-testid="demo-header">
      <div className="flex items-center gap-2">
        <span className="font-mono text-base font-semibold text-foreground">remotion-kit</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          v0.1 demo
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex items-center gap-1 rounded border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent"
          data-testid="header-template-picker"
          data-state={pickerOpen ? 'open' : 'closed'}
          aria-expanded={pickerOpen}
          aria-haspopup="dialog"
        >
          <span>模板</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label="GitHub"
          data-testid="header-github"
        >
          <GitHubMark className="h-4 w-4" />
        </a>
      </div>
      <TemplatePickerPopover open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </header>
  )
}
