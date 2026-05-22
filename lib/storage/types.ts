// lib/storage/types.ts
//
// Persistence-layer abstraction for the demo app. Business code (the chat
// dock submit flow + the Player) talks only to this interface; it never
// imports `/api/clips` paths or webpack aliases directly. The three
// concrete providers (server fixed-session / client IndexedDB / server
// ephemeral) all satisfy the same contract.

import type React from 'react'

export type StorageMode =
  | 'server-fixed-session'
  | 'client-indexed-db'
  | 'server-ephemeral'

export interface GenerateRequest {
  scenePrompt: string
  durationSeconds: number
  cameraHint?: string
}

export interface GenerateResult {
  ok: true
  generatedAt: string
  codeLength: number
}

/** Shape thrown by providers; mirrors the v0.2 fix LLMError contract. */
export interface StorageError {
  code: string // AUTH_* | QUOTA_* | SYSTEM_* | VALIDATION_* | STORAGE_*
  message: string
  retryable?: boolean
  traceId?: string
  cause?: unknown
}

export function isStorageError(value: unknown): value is StorageError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StorageError).code === 'string' &&
    typeof (value as StorageError).message === 'string'
  )
}

export function makeStorageError(
  code: string,
  message: string,
  extra: Partial<Omit<StorageError, 'code' | 'message'>> = {},
): StorageError {
  return { code, message, ...extra }
}

/** Lazy Composition factory consumed by @remotion/player `lazyComponent`. */
export type CompositionFactory = () => Promise<{
  default: React.ComponentType<Record<string, unknown>>
}>

export interface StorageProvider {
  readonly mode: StorageMode

  /**
   * Ensure a session is ready to receive generations. Idempotent within a
   * provider instance lifetime. Returns the clip id used for subsequent
   * Player lazy loads.
   */
  ensureSession(signal?: AbortSignal): Promise<string>

  /**
   * Trigger LLM generation against the active session and persist the
   * resulting Composition.tsx wherever the provider decided to keep it.
   * Errors throw a `StorageError`.
   */
  callGenerate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult>

  /**
   * Return a lazy factory the Player can consume for the given clipId.
   * The factory itself is sync; the import inside is async.
   */
  composition(clipId: string): CompositionFactory

  /**
   * Wipe the active session. Used for "back to factory" UX, not wired to
   * any UI yet but providers must implement.
   */
  reset(): Promise<void>
}
