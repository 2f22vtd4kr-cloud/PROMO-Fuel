---
name: Session handoff protocol
description: How to read and write HANDOFF.md — the rolling session context document for PROMO-Fuel.
---

# Session Handoff Protocol

## The rule (non-negotiable)
1. **Session start**: read `HANDOFF.md` completely before touching any code.
2. **After every response turn** that does real work: rewrite `HANDOFF.md`.
3. **Do not accumulate**: the file is NOT a changelog. Previous session content gets dropped, not appended.

**Why:** Replit sessions are isolated. Without a current-state handoff, each new agent starts blind and repeats work. The file must be lean so it's always fully read — a snowballing doc stops being read.

## Document structure (strict)

```
# PROMO-Fuel — Handoff
Last updated: <date>

> AGENT PROTOCOL block (keep verbatim, always at top)

## This session
  What was worked on this turn. Who asked for what, what was built, what was decided.
  What to try next if interrupted.
  ← REPLACE THIS BLOCK ENTIRELY on each new session. Never carry forward prior session content here.

## Current state
  Brief bullet list: what's running, what's broken, any active blockers.
  ← UPDATE this each session with current reality.

## Required secrets (check on fresh import)
  The 8 secret names + sources. Static — only changes if secrets change.

## Standing architecture facts
  Ports, key files, startup sequence. Permanent reference — rarely changes.
```

## What "replace this session" means
When you start a new session and write a new turn of work:
- The PREVIOUS "This session" block is **deleted**
- Your new work goes in as the fresh "This session" block
- "Current state" is updated to reflect what's true NOW
- Everything else stays the same

Previous session details live in git history if ever needed. HANDOFF.md should never exceed ~150 lines.

## Frequency
Rewrite HANDOFF.md at the end of EVERY response that does real work. If the session ends mid-conversation, at minimum the last turn's work is captured.
