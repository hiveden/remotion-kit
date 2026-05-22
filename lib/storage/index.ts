// lib/storage/index.ts
//
// Factory + singleton cache for the active StorageProvider. Resolution
// order: URL ?storage=... > NEXT_PUBLIC_STORAGE_MODE env > default
// ('server-fixed-session'). On the server we always return the default so
// SSR can render without touching client-only providers.

import type { StorageMode, StorageProvider } from './types'

const DEFAULT_MODE: StorageMode = 'server-fixed-session'

let cached: StorageProvider | null = null

export function getStorageMode(): StorageMode {
  if (typeof window === 'undefined') return DEFAULT_MODE
  try {
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('storage')
    if (fromUrl === 'client-indexed-db' || fromUrl === 'server-fixed-session') {
      return fromUrl
    }
  } catch {
    /* invalid URL — fall through to env / default */
  }
  const fromEnv = process.env.NEXT_PUBLIC_STORAGE_MODE
  if (fromEnv === 'client-indexed-db' || fromEnv === 'server-fixed-session') {
    return fromEnv
  }
  return DEFAULT_MODE
}

export async function getStorageProvider(): Promise<StorageProvider> {
  if (cached) return cached
  const mode = getStorageMode()
  if (mode === 'client-indexed-db') {
    const { ClientIndexedDBProvider } = await import('./client-indexed-db')
    cached = new ClientIndexedDBProvider()
  } else {
    const { ServerFixedSessionProvider } = await import('./server-fixed-session')
    cached = new ServerFixedSessionProvider()
  }
  return cached
}

/** Test hook — clears the singleton so each test starts fresh. */
export function resetStorageProviderCache(): void {
  cached = null
}

export type { StorageProvider, StorageMode } from './types'
