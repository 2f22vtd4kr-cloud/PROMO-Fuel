# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### Account Factory "all steps waiting" — Root cause found and fixed

The factory SSE stream died silently before yielding a single event. Four compounding bugs:

**Bug 1 — Python `UnboundLocalError` (primary root cause)**
Inside `generate()` (the async generator passed to `StreamingResponse`), the line
`force_country = False` appeared at the bottom of the while-loop body. Python's compile-time
scoping treats ANY variable that is assigned anywhere in a function as local throughout that
function. So the earlier `force_country=force_country` keyword-argument read (passed to
`_registration_stream`) raised `UnboundLocalError` before a single SSE event was yielded.
FastAPI had already sent `200 OK + Content-Type: text/event-stream`, so the client received
an HTTP 200 with an empty body. Frontend stayed frozen in "running" state with all 8 steps
at "waiting" because `runState` was set before the fetch and never cleared.

Fix: split `generate()` into two nested generators: a thin `generate()` that yields a
keepalive and wraps the real work in try/except, and `_generate_inner()` that contains
the actual batch loop. Inside `_generate_inner()`, renamed to `_force_country = force_country`
at the top (local copy, safe to re-assign) and use `_force_country` everywhere, removing
the scoping conflict entirely.

**Bug 2 — Silent exception swallowing in the async generator**
Any exception escaping the generator after headers were sent produced an empty body.
Fix: `generate()` now wraps `_generate_inner()` in `try/except Exception` and yields an
`error` SSE event with the exception message so the user sees what went wrong.

**Bug 3 — No immediate keepalive chunk**
Fix: `generate()` yields `": keepalive\n\n"` as its very first chunk (before doing any
network work) to force Replit's CDN to transmit the response headers + first byte immediately.

**Bug 4 — Node.js proxy using `pipe()` for SSE**
`proxyRes.pipe(res)` relied on OS-level TCP coalescing. In Replit production CDN, small
chunks could sit in the kernel buffer. Fix: replaced with a manual `data` event handler
that calls `res.write(chunk)` then `res.socket?.uncork()` after each chunk, and sets
`sock.setTimeout(0)` to prevent idle-timeout on long registrations.

**Bug 5 — Frontend "frozen running" state**
If the stream ended with no terminal event, `runState` was stuck at "running" forever.
Fix: added `receivedTerminal` bool. After the reader loop exits, if still false, shows
`"⚠️ Поток закрито без відповіді від сервера"` and sets `runState("error")`.

---

## Current system state

- **Telegram Bot**: RUNNING (supervisor + workers + FastAPI on 8083)
- **API Server**: RUNNING (Express on 8080, dist rebuilt)
- **Telegram Mini App**: RUNNING on port 5000 (dist rebuilt)
- **DB**: campaigns.db current

---

### Step Timing Display + Session Summary Row

**Step timing**: Each step shows a live ticking badge (100ms, accent color) while running → frozen green/red badge showing time taken when done/error. `StepState.startedAt`+`elapsedMs`; `updateStep` auto-stamps; `StepRow` has `useState`+`useEffect` interval.

**Session summary strip**: The Session Stats Strip now appears as soon as registration starts (condition: `runState !== "idle" || ...`). Shows:
- Live ticking session total (1s interval, `sessionLiveMs` state driven by `useEffect` on `runState`) in accent/green/muted color depending on outcome
- `·` divider → `$0.18 spent` (SMSPool cost)
- `·` divider → recycled skip counts (existing)
`sessionStartedAt` ref stamped in `launch()`; `sessionElapsedMs` state frozen in `complete`/`batch_done`/`error` handlers; both cleared in `reset()`.

## Key file locations

- `account_factory.py` — `generate()` + `_generate_inner()` at ~line 2419; `_force_country` fix at ~line 2451
- `artifacts/api-server/src/app.ts` — SSE proxy manual write+uncork at ~line 149
- `artifacts/telegram-miniapp/src/pages/AccountFactory.tsx` — `StepRow` with timing at ~line 102; `updateStep` at ~line 1311; `receivedTerminal` guard at ~line 1380

---

## Pending / watch items

- Factory not end-to-end tested in this session (requires real SMSPOOL_API_KEY + proxy + 2FA password in prod)
- `python-multipart` still not installed in `.pythonlibs` — upload works via JSON+base64 without it
- `assets/pending_avatars/` empty on fresh import — user must upload photos before AI mode can assign avatars
- `[pg-guard] FAILED to create saved_proxies — duplicate key` in API Server logs is harmless
