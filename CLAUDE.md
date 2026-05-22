# CLAUDE.md

> Agent entry point for `@hiveden/remotion-kit`. Read this before touching code.

## Boundaries — what this repo IS and IS NOT

### IS

- Remotion **clip** tooling (single short clip, not a multi-clip film)
- A Next.js workspace at `localhost:3200/clip` for brief composition + preview
- An LLM-powered code scaffolder that writes `.workspace/clips/<id>/src/Composition.tsx`
- Tool-class library — built so a coding agent can drive it

### IS NOT

- ❌ A general video framework (Remotion / HyperFrames already do that)
- ❌ A multi-shot editor / NLE / timeline composer <!-- purity-allow: documenting boundary -->
- ❌ A renderer / FFmpeg orchestration layer (use `npx remotion render` directly)
- ❌ A pipeline tool (no episode / shot / series / pipeline concepts allowed in `app/`, `lib/`, `components/`) <!-- purity-allow: documenting boundary -->
- ❌ A SaaS — runs locally, no backend services

## Red lines

1. **No business concepts in the source tree.** `episode`, `shot`, `series`, `pipeline` must not appear in `*.ts`, `*.tsx`, `*.md` files outside `tests/`, `docs/`, `.workspace/`. Enforced by `bun run check:purity` (pre-commit + CI). <!-- purity-allow: documenting the rule -->
2. **No API keys in commits.** `sk-...` patterns are blocked by `bun run check:secrets`.
3. **No `--no-verify` to bypass hooks.** If a hook fails, fix the cause or add an inline `// purity-allow: <reason>` / `// secret-allow: <reason>` comment with justification.
4. **No new dependencies without justification.** This repo intentionally avoids Radix / shadcn / framer-motion / lucide. Clip UI is plain HTML + Tailwind. Adding a dep means a thread discussion first.
5. **No multi-clip features.** If a feature only makes sense for "edit 5 clips together", it belongs elsewhere.
6. **No renderer logic in the repo.** Rendering is the agent's job in the terminal: `cd .workspace/clips/<id> && npx remotion render`.
7. **`.workspace/` is user-owned.** Never auto-commit anything under it. It's in `.gitignore`.

## Project shape

```
app/                       Next.js App Router
├─ layout.tsx
├─ page.tsx                Landing page
├─ clip/                   (T2) Clip workspace UI
└─ api/clips/              (T2) Clip CRUD + generate API

lib/                       (T2) Server + editor modules
├─ editor/                 Pure types + validators (no fs IO)
│  ├─ clip-instance.ts     ClipBrief schema
│  ├─ brand-mock.ts
│  ├─ caption-presets.ts
│  └─ publish-platforms.ts
└─ server/                 Server-only fs IO + LLM
   ├─ clip-store.ts        Brief + references CRUD on .workspace/clips/
   ├─ clip-bootstrap.ts    Scaffold .workspace/clips/<id>/
   ├─ clip-generate.ts     LLM-powered Composition.tsx generation
   ├─ llm-client.ts        OpenAI client (single provider)
   └─ paths.ts

components/clip/           (T2) UI components

examples/                  (T3) Hello-clip brief.note samples

docs/api/openapi.yaml      (T2) Schema-first API contract SSOT
.workspace/clips/<id>/     User-owned clip directories (gitignored)
```

## Task routing

| You need to... | Read |
|---|---|
| Understand what this repo is / isn't | This file's "Boundaries" + `README.md` |
| Add a new clip from scratch | The 30-second hello clip path in `README.md` |
| Modify the brief schema | `lib/editor/clip-instance.ts` (T2) |
| Touch fs persistence | `lib/server/clip-store.ts` (T2) |
| Change LLM behavior / prompts | `lib/server/clip-generate.ts` + `lib/server/llm-client.ts` (T2 + T4) |
| Add a UI control | `components/clip/*` (T2) — check existing patterns first |
| Modify the API surface | Update `docs/api/openapi.yaml` first, then `app/api/clips/*` |

## Conventions

- **Package manager**: `bun` (not npm, not pnpm). `bun install`, `bun run <script>`.
- **Linter**: `oxlint` (not eslint).
- **Tests**: `vitest`.
- **TypeScript**: strict + `noUncheckedIndexedAccess`. Prefer type guards over `as T`.
- **Imports**: use `@/*` alias for repo-internal, `@clip-workspace/*` for runtime clip workspace.
- **No comments stating the obvious.** Only document non-obvious WHYs.

## When the agent invokes this skill

If a request matches "Remotion clip" workflow and the agent is in this repo, follow this file's red lines and routing table. Outside this repo, this file does not apply — point users to upstream Remotion or HyperFrames docs instead.
