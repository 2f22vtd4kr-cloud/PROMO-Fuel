---
name: Telegram Anti-Block Strategy (RU)
description: Key risks, rate limits, and anti-ban measures for Telegram bulk messaging targeting Russian audience
---

# Telegram Anti-Block Strategy (RU)

## Rate Limits
- ~30 msg/sec across different chats (free tier). Paid broadcasts up to 1000/sec (requires Stars balance + 10k MAU)
- 1 msg/sec per single chat
- FloodWaitError, 429, account/bot ban risks
- RU-specific: Роскомнадзор, mobile operators, suspicious IPs

## Anti-Block Measures (multi-layer)

### Multiple Accounts (userbots via Telethon)
- 5–20+ aged Russian accounts (SIM + warm-up). Each with a separate session.

### Proxies
- Residential / Mobile proxies RU (Moscow, SPb, regions)
- Rotating sticky sessions (10–30 min)
- Providers: Proxy-Seller, Shifter, LiveProxies etc.
- SOCKS5. Never bare datacenters.

### Rate Limiting + Jitter
- Random delays 1–5 sec between messages + exponential backoff on FloodWait

### Account Warm-Up
- Gradual volume increase (day 1: 50 msg, day 7: 300+)

### Human-Like Behavior
- Vary text (synonyms, emoji), add pauses, sometimes reactions/typing

### Queue + Workers
- Celery / Redis Queue / asyncio tasks. Distribute across worker accounts.

### Opt-In Only
- Only users who messaged the bot or consented. Store user_id, chat_id, consent timestamp.

### Monitoring
- Log Flood, bans → auto-pause and account switch

### Fallback
- If Telethon ban → switch to Bot API (fewer features but more stable)

**Why:** Telegram aggressively bans spam. Russian regulatory environment adds additional IP/operator-level blocking.
**How to apply:** Every campaign sender implementation must incorporate these layers. The accounts table should track per-account send volume and status.
