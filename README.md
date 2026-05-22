# @hiveden/remotion-kit

> Remotion clip tooling — agent-shaped brief composer + preview + LLM-powered scaffolding.

A focused toolkit for building Remotion clips with a coding agent (Claude Code, Cursor, Codex). You write a brief in the browser; the agent writes the composition; you preview it instantly.

## What this is

- A Next.js app that hosts a clip workspace at `localhost:3200/clip`
- Each clip lives at `.workspace/clips/<id>/` (brief + composition source + preview cache)
- LLM-powered scaffolding (OpenAI-compatible) generates `src/Composition.tsx` from the brief
- `@remotion/player` previews the result live, with hot reload

## What this is **NOT**

- ❌ Not a general video framework (use [Remotion](https://www.remotion.dev) or [HyperFrames](https://hyperframes.heygen.com) for that)
- ❌ Not a SaaS or hosted service
- ❌ Not for non-Remotion video pipelines (no FFmpeg orchestration, no diffusion models, no NLE)
- ❌ Not for episode / shot / series / pipeline business workflows (those belong upstream) <!-- purity-allow: documenting boundary -->

See [`CLAUDE.md`](./CLAUDE.md) for the full boundaries.

## 30-second hello clip *(placeholder — finalized in T3)*

```bash
git clone https://github.com/hiveden/remotion-kit.git
cd remotion-kit
bun install
cp .env.example .env.local
bun run dev
# open http://localhost:3200/clip
```

Click **+ New clip**, fill in the brief, hit Generate. The agent writes the composition; the preview pane shows it.

## Requirements

- Node.js >= 22 (or [Bun](https://bun.sh) >= 1.3)
- An OpenAI-compatible LLM endpoint (defaults to a local CPA proxy at `http://localhost:8317/v1`)

## Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Start Next.js dev server on port 3200 |
| `bun run build` | Production build |
| `bun run start` | Run production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `oxlint .` |
| `bun run test` | `vitest run` |
| `bun run check:purity` | Fail if business concepts (`episode|shot|series|pipeline`) leak in <!-- purity-allow: documenting the check itself --> |
| `bun run check:secrets` | Fail if OpenAI keys (`sk-...`) leak in |
| `bun run check` | All of the above sequentially |

## Status

- **T1 (scaffold)** — ✅ this commit
- **T2 (clip module migration from astral-video)** — in progress
- **T3 (end-to-end loop validation)** — pending
- **T4 (LLM integration: OpenAI GPT-5.5 via CPA)** — pending

## License

[Apache 2.0](./LICENSE)
