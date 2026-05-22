'use client'

import React from 'react'
import type { AgentDockState, LlmErrorCategory } from '@/lib/demo/types'
import { Send, Spinner } from './icons'

interface Props {
  onSubmit: (prompt: string) => Promise<void>
  onCancel: () => void
}

interface ErrorInfo {
  category: LlmErrorCategory
  code: string
  message: string
}

interface InternalState {
  state: AgentDockState
  startedAt: number | null
  finishedSec: number | null
  isMock: boolean
  error: ErrorInfo | null
}

type Action =
  | { type: 'submit' }
  | { type: 'streaming' }
  | { type: 'done'; finishedSec: number; isMock: boolean }
  | { type: 'error'; error: ErrorInfo }
  | { type: 'dismiss' }

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'submit':
      return { ...state, state: 'submitting', startedAt: Date.now(), error: null, finishedSec: null }
    case 'streaming':
      return { ...state, state: 'streaming' }
    case 'done':
      return { ...state, state: 'done', finishedSec: action.finishedSec, isMock: action.isMock }
    case 'error':
      return { ...state, state: 'error', error: action.error }
    case 'dismiss':
      return { state: 'idle', startedAt: null, finishedSec: null, isMock: false, error: null }
    default:
      return state
  }
}

const INITIAL: InternalState = {
  state: 'idle',
  startedAt: null,
  finishedSec: null,
  isMock: false,
  error: null,
}

const ERROR_LABEL: Record<LlmErrorCategory, string> = {
  AUTH: 'API key 无效，检查 .env.local',
  QUOTA: 'API 余额不足或限流',
  SYSTEM: '服务异常，稍后再试',
  VALIDATION: '输入格式问题',
}

const ERROR_EMOJI: Record<LlmErrorCategory, string> = {
  AUTH: '🔐',
  QUOTA: '💰',
  SYSTEM: '⚠',
  VALIDATION: '⚠',
}

export interface AgentDockHandle {
  reportSubmit: () => void
  reportStreaming: () => void
  reportDone: (finishedSec: number, isMock: boolean) => void
  reportError: (error: ErrorInfo) => void
}

export const AgentChatDock = React.forwardRef<AgentDockHandle, Props>(function AgentChatDock(
  { onSubmit, onCancel },
  ref,
) {
  const [internal, dispatch] = React.useReducer(reducer, INITIAL)
  const [prompt, setPrompt] = React.useState('')

  React.useImperativeHandle(ref, () => ({
    reportSubmit: () => dispatch({ type: 'submit' }),
    reportStreaming: () => dispatch({ type: 'streaming' }),
    reportDone: (finishedSec, isMock) => dispatch({ type: 'done', finishedSec, isMock }),
    reportError: (error) => dispatch({ type: 'error', error }),
  }))

  // Auto-dismiss success status after 5s.
  React.useEffect(() => {
    if (internal.state !== 'done') return
    const t = setTimeout(() => dispatch({ type: 'dismiss' }), 5000)
    return () => clearTimeout(t)
  }, [internal.state])

  const locked = internal.state === 'submitting' || internal.state === 'streaming'
  const canSubmit = prompt.trim().length > 0 && !locked

  function handleSubmit() {
    if (!canSubmit) return
    const value = prompt.trim()
    setPrompt('')
    void onSubmit(value)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasStatus = internal.state !== 'idle'

  return (
    <section
      className="flex flex-col border-t border-border bg-panel"
      data-testid="agent-dock"
      data-state={internal.state}
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <span aria-hidden className="text-text-lo">
          💬
        </span>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={locked}
          placeholder="Ask AI 改 brief / 风格..."
          className="flex-1 rounded-md border border-border bg-input px-3 py-1.5 text-[12px] text-text-hi placeholder:text-text-lo focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="agent-dock-input"
          aria-label="Agent 输入框"
        />
        {locked ? (
          <button
            type="button"
            onClick={onCancel}
            className="grid h-7 w-7 place-items-center rounded-md bg-primary text-white transition-opacity duration-100 hover:opacity-90"
            data-testid="agent-dock-cancel"
            aria-label="取消"
          >
            <Spinner className="h-3 w-3" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="grid h-7 w-7 place-items-center rounded-md bg-primary text-white transition-opacity duration-100 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="agent-dock-send"
            aria-label="发送给 AI"
          >
            <Send className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>
      {hasStatus && (
        <div
          className="flex min-h-7 items-center gap-2 border-t border-border-soft px-3 py-1 text-[11px]"
          data-testid="agent-dock-status"
          data-state={internal.state}
        >
          {internal.state === 'submitting' && (
            <>
              <Spinner className="h-3 w-3 text-primary" aria-hidden />
              <span className="font-mono text-text-md">提交给 GPT-5.5…</span>
            </>
          )}
          {internal.state === 'streaming' && (
            <>
              <Spinner className="h-3 w-3 text-primary" aria-hidden />
              <span className="font-mono text-text-md">
                ⏳ Streaming · {internal.startedAt ? ((Date.now() - internal.startedAt) / 1000).toFixed(1) : 0}s
              </span>
            </>
          )}
          {internal.state === 'done' && (
            <>
              <span aria-hidden>✓</span>
              <span className="font-mono text-text-md">
                完成 · {(internal.finishedSec ?? 0).toFixed(1)}s
                {internal.isMock && <span className="ml-1 text-text-lo">(mock)</span>}
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'dismiss' })}
                className="ml-auto rounded px-2 py-0.5 text-[10px] text-text-lo hover:bg-input hover:text-text-hi"
                data-testid="agent-dock-dismiss"
                aria-label="关闭状态"
              >
                ✕
              </button>
            </>
          )}
          {internal.state === 'error' && internal.error && (
            <ErrorLine error={internal.error} onDismiss={() => dispatch({ type: 'dismiss' })} />
          )}
        </div>
      )}
    </section>
  )
})

function ErrorLine({
  error,
  onDismiss,
}: {
  error: ErrorInfo
  onDismiss: () => void
}) {
  const category = error.category
  const isAuth = category === 'AUTH'
  const isValidation = category === 'VALIDATION'
  const textClass = isAuth
    ? 'text-primary'
    : isValidation
      ? 'text-text-md'
      : 'text-destructive'
  return (
    <>
      <span aria-hidden>{ERROR_EMOJI[category]}</span>
      <span className={'font-mono ' + textClass} data-testid="agent-dock-error-message">
        {error.code}: {ERROR_LABEL[category]}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto rounded px-2 py-0.5 text-[10px] text-text-lo hover:bg-input hover:text-text-hi"
        data-testid="agent-dock-error-dismiss"
        aria-label="关闭错误"
      >
        ✕
      </button>
    </>
  )
}

export function categorize(code: string): LlmErrorCategory {
  if (code.startsWith('AUTH_')) return 'AUTH'
  if (code.startsWith('QUOTA_')) return 'QUOTA'
  if (code.startsWith('VALIDATION_')) return 'VALIDATION'
  return 'SYSTEM'
}
