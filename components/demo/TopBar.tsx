'use client'

import React from 'react'
import { Sun, Moon, GitHubMark } from './icons'
import { useTheme } from './ThemeProvider'

interface Props {
  templateLabel: string
  aiGenerated: boolean
  onUndo: () => void
}

const REPO_URL = 'https://github.com/hiveden/remotion-kit'

export function TopBar({ templateLabel, aiGenerated, onUndo }: Props) {
  const { theme, toggle } = useTheme()
  return (
    <header
      className="relative z-10 flex h-12 items-center gap-3 border-b border-border bg-panel px-3 shadow-panel transition-colors duration-200"
      data-testid="demo-topbar"
    >
      <div className="flex h-full items-center gap-2 border-r border-border pr-3">
        <span
          className="grid h-6 w-6 place-items-center rounded font-mono text-[11px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--rk-primary), var(--rk-secondary))' }}
        >
          RK
        </span>
        <span className="font-mono text-xs text-text-md">remotion-kit</span>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <span
          className="rounded-full border border-[color:rgba(168,85,247,0.35)] bg-[color:rgba(168,85,247,0.12)] px-3 py-1 font-mono text-[11px] text-primary"
          data-testid="topbar-current-template"
        >
          当前模板：<span className="text-text-hi">{templateLabel}</span>
        </span>
        {aiGenerated && (
          <span
            className="flex h-7 items-center gap-1.5 rounded-full border border-[color:rgba(168,85,247,0.35)] bg-[color:rgba(168,85,247,0.12)] pl-3 pr-1 font-mono text-[11px] text-primary"
            data-testid="topbar-ai-generated-chip"
          >
            ✨ AI generated
            <button
              type="button"
              onClick={onUndo}
              className="rounded-full px-2 py-0.5 text-text-md transition-colors hover:bg-[color:rgba(168,85,247,0.18)] hover:text-text-hi"
              data-testid="topbar-ai-undo"
              aria-label="撤销 AI 生成"
              title="撤销回调参前的版本"
            >
              ↩ 撤销
            </button>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="grid h-7 w-7 place-items-center rounded-full border border-border text-text-md transition-colors duration-150 hover:border-border-strong hover:bg-input hover:text-text-hi"
          aria-label={`切换主题（当前 ${theme}）`}
          data-testid="topbar-theme-toggle"
          data-state={theme}
        >
          {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-7 w-7 place-items-center rounded text-text-md transition-colors hover:bg-input hover:text-text-hi"
          aria-label="GitHub"
          data-testid="topbar-github"
        >
          <GitHubMark className="h-4 w-4" />
        </a>
      </div>
    </header>
  )
}
