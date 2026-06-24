---
name: Session handoff protocol
description: Rolling HANDOFF.md convention — how to read and write the session handoff document every session.
---

# Session Handoff Protocol

## The rule
Every session must begin by reading `HANDOFF.md` and end by rewriting it.

**Why:** Replit sessions are isolated. Without a rolling handoff, each new agent starts blind to ongoing work, decisions already made, and bugs already ruled out — causing repeated mistakes and wasted time.

**How to apply:**
1. **Session start** — before touching any code, read `HANDOFF.md` in full. It contains: current state, immediate next action, prior session summaries, do-not-retry list, key architecture facts.
2. **Session end (or after each significant conversation turn)** — rewrite `HANDOFF.md` completely. Carry forward the compressed prior session block. Add a new session summary block covering: what was discussed, what was built/changed, decisions made, things that didn't work.
3. **Session span = 1** — always rewrite the full document. Do NOT append or accumulate. The file stays a single rolling document, not a changelog.

## Document structure (required sections)
```
# PROMO-Fuel — Session Handoff
**Last updated:** <date> (Session N)

> AGENT PROTOCOL — READ FIRST (the rule, always keep this)

## Current State
  What's working, what's broken, what's blocked — right now.

## Immediate Next Action
  The single most important thing to do next. Be specific.

## Session N Summary (This Session)
  What was discussed and changed. Key files modified. Decisions made.

## Session N-1 Summary (Previous Session)  [compressed]
  Brief summary of prior session. Roll older sessions into this block.

## Key Architecture Reference
  Ports, secrets, startup sequence, key files — static reference.
```

## Frequency — every turn, not just session end
Update `HANDOFF.md` at the END OF EVERY RESPONSE — not just at session end.
Each response that does real work (builds something, diagnoses something, makes a decision)
must append/update the current session's summary block before sending the reply.
This way: if the session ends abruptly after any turn, the full context is captured.
