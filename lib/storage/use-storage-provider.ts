'use client'

import React from 'react'
import type { StorageProvider } from './types'
import { getStorageProvider } from './index'

/**
 * Async-loads the active StorageProvider. Returns null while resolving;
 * callers should gate provider-dependent actions on a non-null value.
 * The provider itself is a module-level singleton, so this hook is safe
 * to call from multiple components in the same tree.
 */
export function useStorageProvider(): StorageProvider | null {
  const [provider, setProvider] = React.useState<StorageProvider | null>(null)
  React.useEffect(() => {
    let alive = true
    getStorageProvider().then(
      (p) => {
        if (alive) setProvider(p)
      },
      () => {
        // Provider failed to load — leave null. Caller will see null and can
        // surface a fallback UI.
      },
    )
    return () => {
      alive = false
    }
  }, [])
  return provider
}
