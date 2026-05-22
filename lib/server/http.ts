import 'server-only'
/**
 * Route Handler 统一响应 helper。
 */
import { NextResponse } from 'next/server'

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function sendError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** SSE 响应头 */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const
