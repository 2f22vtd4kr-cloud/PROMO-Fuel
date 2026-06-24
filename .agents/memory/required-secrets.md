---
name: Required secrets on fresh import
description: When starting a session after a fresh GitHub repo import, check and request any missing secrets before doing any work.
---

# Required Secrets — Fresh Import Protocol

## The rule
At the START of every session, run `viewEnvVars()` in code_execution.
If any of the 8 required secrets are missing → call `requestEnvVar()` for them before doing anything else.

**Why:** Replit secrets are per-Repl. A fresh GitHub import creates a new Repl with no secrets. The app silently fails without them. The agent must request them proactively.

**How to apply:**
```javascript
const result = await viewEnvVars({ type: "secret" });
const required = [
  "TELEGRAM_TOKEN", "TELETHON_API_ID", "TELETHON_API_HASH",
  "ADMIN_TELEGRAM_ID", "GEMINI_API_KEY", "GROQ_API_KEY",
  "SMSPOOL_API_KEY", "API_SECRET"
];
const missing = required.filter(k => !result.secrets[k]);
if (missing.length > 0) {
  await requestEnvVar({
    requestType: "secret",
    keys: missing,
    userMessage: "Fresh Replit import — please enter the required secrets to start the app. See HANDOFF.md 'Required Secrets' section for where to get each one."
  });
}
```

## The 8 required secrets
| Secret | Where to get it |
|---|---|
| `TELEGRAM_TOKEN` | @BotFather on Telegram |
| `TELETHON_API_ID` | https://my.telegram.org/apps |
| `TELETHON_API_HASH` | https://my.telegram.org/apps |
| `ADMIN_TELEGRAM_ID` | @userinfobot on Telegram |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `SMSPOOL_API_KEY` | https://smspool.net/profile |
| `API_SECRET` | Any strong random string (openssl rand -hex 32) |

## Non-sensitive env vars (already in Replit project, no secret needed)
- `PORT=8080` — already set as shared env var
