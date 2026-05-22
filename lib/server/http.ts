import 'server-only'
/**
 * Route Handler unified response helpers.
 */
import { NextResponse } from 'next/server'

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export interface ErrorOptions {
  retryable?: boolean
  traceId?: string
}

export function sendError(
  status: number,
  code: string,
  message: string,
  opts: ErrorOptions = {},
): NextResponse {
  const error: { code: string; message: string; retryable?: boolean; trace_id?: string } = {
    code,
    message,
  }
  if (opts.retryable) error.retryable = true
  if (opts.traceId) error.trace_id = opts.traceId
  return NextResponse.json({ error }, { status })
}

/** SSE response headers */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const
