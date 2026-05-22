# AGENTS.md

OpenAI Codex / generic agent entry point. **The full project context is in [`CLAUDE.md`](./CLAUDE.md)** — boundaries, red lines, task routing, conventions are all there.

> Read `CLAUDE.md` "Boundaries" and "Red lines" sections before any task. Do not skip.

## Quickstart

```bash
bun install
bun run dev          # http://localhost:3200
bun run check        # typecheck + lint + purity + secrets
```

## Toolchain

- Bun (package manager + runtime)
- Next.js 16 + React 19
- @remotion/player for preview, @remotion/cli for `npx remotion render` (user-driven, not in-app)
- OpenAI SDK for LLM scaffolding (via CPA proxy by default)
- oxlint, vitest, lefthook

## Composition validation

After a clip is generated or edited, the user should run:

```bash
cd .workspace/clips/<id>
npx remotion preview
```

Rendering is the user/agent's terminal job — this repo does not orchestrate FFmpeg.
