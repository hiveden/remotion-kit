// Stub for `server-only` so vitest can import modules that guard themselves
// with `import 'server-only'`. Real Next.js builds use the upstream package
// to fail noisy when a server-only module is imported into a client bundle.
export {}
