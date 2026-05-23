// lib/storage/client-bundler.ts
//
// Runtime tsx → JS bundler for the ClientIndexedDB provider. Uses sucrase
// (pure JS, no wasm, no worker) so transform is synchronous and side-steps
// the esbuild-wasm initialize() hang we saw when the bundler runs inside
// the Remotion Player render cycle.
//
// Output is CJS — we load it via `new Function('module','exports','require',
// code)` (which requires CSP `script-src 'unsafe-eval'`). External
// dependencies (react / remotion / @remotion/*) are resolved at runtime
// against window.__rkHostModules registered by lib/storage/host-globals.ts.

import * as React from 'react'
import { transform as sucraseTransform } from 'sucrase'

declare global {
  interface Window {
    __rkHostModules?: Record<string, unknown>
  }
}

/**
 * Eager-load hook kept for backwards compat with host-globals warm-up.
 * Sucrase is synchronous and self-contained so this is effectively a no-op,
 * but we keep the signature so existing call sites don't break.
 */
export function ensureBundlerReady(): Promise<void> {
  return Promise.resolve()
}

/**
 * Transform tsx → CommonJS JS string. Throws with a sucrase-formatted
 * SyntaxError on parse failure. Synchronous internally; the async signature
 * lets callers swap in a wasm-backed transform later without rewrites.
 */
export async function transformTsx(tsx: string): Promise<string> {
  const result = sucraseTransform(tsx, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'classic',
    jsxPragma: 'React.createElement',
    jsxFragmentPragma: 'React.Fragment',
    production: true,
  })
  return result.code
}

/**
 * Module resolver used at runtime by the eval'd CJS bundle. Maps the bare
 * specifiers the LLM is allowed to import to the host page's already-loaded
 * React / Remotion instances.
 */
function makeRequire(): (name: string) => unknown {
  const hostModules =
    typeof window !== 'undefined' && window.__rkHostModules
      ? window.__rkHostModules
      : {}
  return (name: string) => {
    const hit = hostModules[name]
    if (hit !== undefined) return hit
    if (name === 'react/jsx-runtime' || name === 'react/jsx-dev-runtime') {
      const r = hostModules['react'] as typeof React | undefined
      if (r) {
        return {
          jsx: (
            type: React.ElementType,
            props: Record<string, unknown> | null,
            key?: React.Key | null,
          ) => r.createElement(type, key ? { ...props, key } : props),
          jsxs: (
            type: React.ElementType,
            props: Record<string, unknown> | null,
            key?: React.Key | null,
          ) => r.createElement(type, key ? { ...props, key } : props),
          jsxDEV: (
            type: React.ElementType,
            props: Record<string, unknown> | null,
            key?: React.Key | null,
          ) => r.createElement(type, key ? { ...props, key } : props),
          Fragment: r.Fragment,
        }
      }
    }
    throw new Error(`Module not available in client bundler runtime: ${name}`)
  }
}

interface EvaluatedModule {
  default?: React.ComponentType<Record<string, unknown>>
  [key: string]: unknown
}

/**
 * Evaluate a transformed CJS bundle and return its default export, which is
 * the React component the Player will mount. Wraps the result so render-time
 * errors propagate to the React ErrorBoundary instead of silently producing
 * an empty Player canvas (PM red-line: no silent fallback).
 */
export function evaluateBundle(code: string): React.ComponentType<Record<string, unknown>> {
  const moduleObj: { exports: EvaluatedModule } = { exports: {} }
  const exportsObj: EvaluatedModule = moduleObj.exports
  const require = makeRequire()
  const fn = new Function(
    'module',
    'exports',
    'require',
    'React',
    `"use strict";\n${code}\n;return module.exports;`,
  ) as (
    module: { exports: EvaluatedModule },
    exports: EvaluatedModule,
    require: (name: string) => unknown,
    React: typeof import('react'),
  ) => EvaluatedModule
  const evalResult = fn(moduleObj, exportsObj, require, React)
  const final = evalResult ?? moduleObj.exports
  const Component =
    (final.default as React.ComponentType<Record<string, unknown>> | undefined) ??
    (final as unknown as React.ComponentType<Record<string, unknown>>)
  if (typeof Component !== 'function') {
    throw new Error('Bundle has no default export (expected React component)')
  }
  const Wrapped: React.ComponentType<Record<string, unknown>> = (props) => {
    try {
      return React.createElement(Component, props)
    } catch (e) {
      console.error('[rk-bundler] Component render threw:', e)
      throw e
    }
  }
  Wrapped.displayName = `RkBundled(${Component.displayName ?? Component.name ?? 'anonymous'})`
  return Wrapped
}
