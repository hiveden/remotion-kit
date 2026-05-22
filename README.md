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

## Worktree workflow

Multiple agents can collaborate on this repo without git's working tree getting in the way. Each agent (`architect` / `backend` / `frontend` / `qa`) works in its own `git worktree` so `HEAD`, the working tree, and the dev server port are physically isolated.

### Ports

| Worktree | Port | Path |
|---|---|---|
| main (review / fast-merge) | 3200 | `~/projects/remotion-kit` |
| architect | 3200 (by convention; coordinate if main is busy) | `~/projects/remotion-kit.architect` |
| backend | 3201 | `~/projects/remotion-kit.backend` |
| frontend | 3202 | `~/projects/remotion-kit.frontend` |
| qa | 3203 | `~/projects/remotion-kit.qa` |

Start dev servers explicitly with `PORT=<n> bun run dev` — no worktree starts one automatically.

### Helper script

```bash
./scripts/worktree.sh add <role> [feature-name]   # create worktree + branch + bun install
./scripts/worktree.sh finish <role>               # fast-merge to main, push, cleanup
./scripts/worktree.sh remove <role>               # cleanup without merging
./scripts/worktree.sh list                        # show current worktrees
```

`add` creates a fresh branch `<role>/<feature-name>` from `origin/main`, links the worktree at `~/projects/remotion-kit.<role>/`, and runs `bun install` (≈1.2s — `bun` hardlinks from its global cache, so disk is cheap).

### Typical session

```bash
# 1. start work
./scripts/worktree.sh add backend openapi-skeleton
cd ~/projects/remotion-kit.backend

# 2. ...edit, commit on the feature branch...
git add docs/api/openapi.yaml && git commit -m "..."

# 3. finish (fast-merges to main, pushes, removes worktree + branch)
cd -
./scripts/worktree.sh finish backend
```

### Conflict avoidance

- **Never `git checkout`** in the main worktree while another agent is committing — that's exactly what we set up worktrees to avoid. The main worktree should stay on `main`, used only for `finish`.
- Two agents starting concurrent `add`s on the same role will collide — coordinate in the thread, or pick distinct feature names.
- A `finish` is the only operation that touches `main` directly. If two agents `finish` at the same time and the push gets rejected (non-fast-forward), pull and retry.

## Pre-commit hooks

[Lefthook](https://github.com/evilmartians/lefthook) wires the same checks into git so a broken commit can't land on `main`. It installs automatically on `bun install` via the `prepare` script.

- **pre-commit** (parallel): `lint` · `typecheck` · `check:secrets` · `check:purity` — each filtered by relevant glob, so unrelated commits aren't slowed down
- **pre-push**: `bun run test`

If a check is wrong for a specific line, suppress it with an inline comment that explains why:

```ts
const message = `episode goes here` // purity-allow: docs only, not business logic
```

```ts
const example = 'sk-AAAA...long' // secret-allow: fixture, not a real key
```

Reviewers should always check the reason — empty `allow` comments are not acceptable.

To re-install hooks manually (rarely needed): `bunx lefthook install`.

## Status

- **T1 (scaffold)** — ✅ this commit
- **T2 (clip module migration from astral-video)** — in progress
- **T3 (end-to-end loop validation)** — pending
- **T4 (LLM integration: OpenAI GPT-5.5 via CPA)** — pending

## License

[Apache 2.0](./LICENSE)
