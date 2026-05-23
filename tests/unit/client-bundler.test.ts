// tests/unit/client-bundler.test.ts
//
// Locks the eval half of the ClientIndexedDB runtime bundler: given a CJS
// string that requires 'react' and exports a component, evaluateBundle must
// resolve 'react' from window.__rkHostModules and return the component.
// esbuild-wasm's transform half needs the real wasm asset, so we test it
// e2e via Playwright instead of here.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as React from 'react'
import { evaluateBundle } from '@/lib/storage/client-bundler'

type WindowShim = { __rkHostModules?: Record<string, unknown> }

describe('client-bundler: evaluateBundle', () => {
  beforeEach(() => {
    const win: WindowShim = { __rkHostModules: { react: React, React: React } }
    ;(globalThis as { window?: WindowShim }).window = win
  })
  afterEach(() => {
    delete (globalThis as { window?: WindowShim }).window
  })

  it('extracts the default export from a CJS module', () => {
    const code = [
      'var R = require("react");',
      'function Hello() { return R.createElement("div", null, "hi"); }',
      'module.exports = { default: Hello };',
    ].join('\n')
    const Component = evaluateBundle(code)
    expect(typeof Component).toBe('function')
    expect((Component as { displayName?: string }).displayName).toBe('RkBundled(Hello)')
  })

  it('falls back to module.exports when there is no `default` key', () => {
    const code = [
      'var R = require("react");',
      'function Hello() { return R.createElement("div", null, "hi"); }',
      'module.exports = Hello;',
    ].join('\n')
    const Component = evaluateBundle(code)
    expect(typeof Component).toBe('function')
  })

  it('throws when the bundle has no callable export', () => {
    const code = 'module.exports = { default: 42 };'
    expect(() => evaluateBundle(code)).toThrow(/no default export/i)
  })

  it('resolves react/jsx-runtime to a shim built on the host React', () => {
    const code = [
      'const { jsx, Fragment } = require("react/jsx-runtime");',
      'function Hello() { return jsx("div", { children: "hi" }); }',
      'module.exports = { default: Hello };',
      '// touch Fragment to ensure the shim exposes it',
      'if (typeof Fragment === "undefined") throw new Error("missing Fragment");',
    ].join('\n')
    const Component = evaluateBundle(code)
    expect(typeof Component).toBe('function')
  })

  it('throws a clear error for unknown bare specifiers', () => {
    const code = 'const x = require("not-a-real-module"); module.exports = { default: x };'
    expect(() => evaluateBundle(code)).toThrow(/Module not available/)
  })
})
