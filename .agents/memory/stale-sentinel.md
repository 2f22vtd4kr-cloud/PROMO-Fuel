---
name: Stale sentinel bug
description: .deps-ready sentinel was committed to git; ensure-*.sh scripts now validate packages even when sentinel exists.
---

# Stale Sentinel Bug — `.deps-ready`

## The rule
Never trust the `.deps-ready` sentinel alone. Always validate that the actual packages/binaries are present.

**Why:** `.deps-ready` was tracked by git and committed. On a fresh Replit import the sentinel exists immediately, so `ensure-python-deps.sh` (fast path A) exited without installing anything — leaving `.pythonlibs/` empty and the bot dead on startup.

**How to apply:**
- `ensure-python-deps.sh` fast path A: `[ -f "$SENTINEL" ] && smoke_test` — both must pass.
- `ensure-node-deps.sh` fast path A: `[ -f "$SENTINEL" ] && [ -f "$VITE_JS" ]` — both must be true.
- `.gitignore` now includes `.deps-ready` to prevent future commits of the sentinel.
- `post-merge.sh` still writes the sentinel after successful install — this is correct.

## What was changed
- `scripts/ensure-python-deps.sh` — sentinel fast-path now also runs `smoke_test()`
- `scripts/ensure-node-deps.sh` — sentinel fast-path now also checks `[ -f "$VITE_JS" ]`
- `.gitignore` — added `.deps-ready` entry
- Note: the file is still tracked by git (removing tracked files requires `git rm --cached`). The script fixes make this harmless.
