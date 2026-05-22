// Stub for `server-only` so vitest can import modules that guard themselves
// with `import 'server-only'`. Real Next.js builds use the upstream package
// to fail noisily when a server-only module is imported into a client bundle.
//
// The real package has no exports — it exists purely for its side effects in
// client bundles. The token below is a no-op marker that exists only to keep
// linters happy (an empty `export {}` trips oxlint's
// `require-module-specifiers`, and an underscore-prefixed name trips
// `no-underscore-dangle`).
export const serverOnlyStub = true as const
