#!/usr/bin/env bash
# Worktree workflow helper for remotion-kit multi-agent collaboration.
#
#   ./scripts/worktree.sh add <role> [feature-name]
#   ./scripts/worktree.sh remove <role>
#   ./scripts/worktree.sh finish <role>   # fast-merge to main + push + remove
#   ./scripts/worktree.sh list
#
# Roles: architect | backend | frontend | qa  (enforces stable port allocation)
#
# Path:   ~/projects/remotion-kit.<role>/
# Branch: <role>/<feature-name>  (feature-name defaults to "work")
# Port:   3200 (main) | 3201 (backend) | 3202 (frontend) | 3203 (qa)
#         architect uses main worktree's 3200 by convention

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(dirname "$REPO_ROOT")"
VALID_ROLES=(architect backend frontend qa)

err() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }
info() { printf '\033[36m→\033[0m %s\n' "$*"; }
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }

require_role() {
  local role="${1:-}"
  [[ -z "$role" ]] && err "role required (one of: ${VALID_ROLES[*]})"
  for r in "${VALID_ROLES[@]}"; do
    [[ "$r" == "$role" ]] && return 0
  done
  err "unknown role '$role' (expected: ${VALID_ROLES[*]})"
}

worktree_path() { echo "$PARENT_DIR/remotion-kit.$1"; }

cmd_add() {
  local role="${1:-}"; require_role "$role"
  local feature="${2:-work}"
  local branch="$role/$feature"
  local path; path="$(worktree_path "$role")"

  [[ -e "$path" ]] && err "worktree path already exists: $path"
  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
    err "branch '$branch' already exists — pick a different feature name or remove old worktree first"
  fi

  info "fetching origin/main"
  git -C "$REPO_ROOT" fetch origin main

  info "creating worktree $path on branch $branch (from main)"
  git -C "$REPO_ROOT" worktree add "$path" -b "$branch" main

  info "installing dependencies (bun)"
  (cd "$path" && bun install --frozen-lockfile)

  ok "worktree ready: $path  (branch $branch)"
  echo
  echo "Next:"
  echo "  cd $path"
  case "$role" in
    backend)  echo "  PORT=3201 bun run dev   # if you need a dev server" ;;
    frontend) echo "  PORT=3202 bun run dev" ;;
    qa)       echo "  PORT=3203 bun run dev   # or start a separate one for Playwright" ;;
    architect) echo "  PORT=3200 bun run dev   # main port; coordinate if main worktree also runs dev" ;;
  esac
  echo "  ... do your work, commit on $branch ..."
  echo "  $REPO_ROOT/scripts/worktree.sh finish $role   # when ready to merge"
}

cmd_remove() {
  local role="${1:-}"; require_role "$role"
  local path; path="$(worktree_path "$role")"

  [[ ! -e "$path" ]] && err "no worktree at $path"

  # Find branch the worktree is on
  local branch
  branch="$(git -C "$path" symbolic-ref --short HEAD 2>/dev/null || echo "")"

  info "removing worktree $path"
  git -C "$REPO_ROOT" worktree remove "$path"

  if [[ -n "$branch" && "$branch" != "main" ]]; then
    info "deleting branch $branch"
    git -C "$REPO_ROOT" branch -d "$branch" 2>/dev/null || \
      printf '\033[33m!\033[0m branch %s not fully merged — left in place (delete manually if intentional)\n' "$branch"
  fi
  ok "removed"
}

cmd_finish() {
  local role="${1:-}"; require_role "$role"
  local path; path="$(worktree_path "$role")"

  [[ ! -e "$path" ]] && err "no worktree at $path"

  # Verify clean
  if ! git -C "$path" diff --quiet || ! git -C "$path" diff --cached --quiet; then
    err "worktree $path has uncommitted changes — commit or stash before finish"
  fi

  local branch
  branch="$(git -C "$path" symbolic-ref --short HEAD)"
  [[ -z "$branch" || "$branch" == "main" ]] && err "worktree on detached HEAD or main — nothing to finish"

  info "fast-merging $branch into main"
  (
    cd "$REPO_ROOT"
    git fetch origin main
    git checkout main
    git pull --ff-only origin main
    git merge --ff-only "$branch"
    git push origin main
  )

  info "removing worktree $path and branch $branch"
  git -C "$REPO_ROOT" worktree remove "$path"
  git -C "$REPO_ROOT" branch -d "$branch"

  ok "finished — $branch merged to main and worktree cleaned up"
}

cmd_list() {
  git -C "$REPO_ROOT" worktree list
}

cmd="${1:-}"; shift || true
case "$cmd" in
  add)    cmd_add "$@" ;;
  remove) cmd_remove "$@" ;;
  finish) cmd_finish "$@" ;;
  list)   cmd_list ;;
  ""|-h|--help)
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *) err "unknown command '$cmd' (expected: add | remove | finish | list)" ;;
esac
