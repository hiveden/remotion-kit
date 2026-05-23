// lib/storage/client-bundler.ts
//
// Runtime tsx → JS bundler for the ClientIndexedDB provider. Pulls
// esbuild-wasm in lazily (once per session), uses CommonJS output so we can
// load the result via `new Function('module','exports','require',code)`
// instead of fighting Blob URL `import()` cross-browser quirks. External
// dependencies (react / remotion / @remotion/*) are resolved at runtime by
// looking up window globals that we register from a shared host module
// (see lib/storage/host-globals.ts).

import * as React from 'react'

declare global {
  interface Window {
    __rkHostModules?: Record<string, unknown>
  }
}

type EsbuildModule = typeof import('esbuild-wasm')

let esbuildPromise: Promise<EsbuildModule> | null = null

async function loadEsbuild(): Promise<EsbuildModule> {
  if (!esbuildPromise) {
    esbuildPromise = (async () => {
      const esbuild = (await import('esbuild-wasm')) as unknown as EsbuildModule
      // esbuild-wasm requires initialize() once per page; subsequent calls
      // throw, so we swallow the "already initialized" path defensively.
      try {
        await esbuild.initialize({
          // The wasm asset is fetched from the CDN to avoid bundling the
          // 3 MB blob into the main Next.js client bundle.
          wasmURL: 'https://unpkg.com/esbuild-wasm@0.28.0/esbuild.wasm',
        })
      } catch (e) {
        // "initialize() called more than once" → fine, keep going.
        const msg = e instanceof Error ? e.message : String(e)
        if (!/already initialized|more than once/i.test(msg)) {
          throw e
        }
      }
      return esbuild
    })()
  }
  return esbuildPromise
}

/**
 * Compile tsx → CJS JavaScript and return a string that can be eval'd via
 * `new Function('module','exports','require',code)`. Throws with a clear
 * message if the compile fails.
 */
export async function transformTsx(tsx: string): Promise<string> {
  const esbuild = await loadEsbuild()
  const result = await esbuild.transform(tsx, {
    loader: 'tsx',
    format: 'cjs',
    target: 'es2020',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    sourcemap: false,
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
    // Fallback for the React jsx-runtime path some LLMs emit when the auto
    // transform is requested; map both legacy and modern to our React.
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
 * the React component the Player will mount.
 */
export function evaluateBundle(code: string): React.ComponentType<Record<string, unknown>> {
  const moduleObj: { exports: EvaluatedModule } = { exports: {} }
  const exportsObj: EvaluatedModule = moduleObj.exports
  const require = makeRequire()
  // Wrap in IIFE-like new Function so module/exports/require/React are scoped.
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
  return Component
}
