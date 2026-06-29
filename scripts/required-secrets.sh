#!/bin/bash
# required-secrets.sh — canonical list of all secrets needed for PROMO-Fuel.
# Sourced by post-merge.sh and any setup script that needs to warn about missing secrets.
# DO NOT put actual values here — only names and descriptions.

REQUIRED_SECRETS=(
  "TELEGRAM_TOKEN:Telegram Bot token — get from @BotFather on Telegram"
  "TELETHON_API_ID:Telethon API ID (integer) — get from https://my.telegram.org/apps"
  "TELETHON_API_HASH:Telethon API Hash — get from https://my.telegram.org/apps"
  "ADMIN_TELEGRAM_ID:Your personal Telegram user ID — get from @userinfobot"
  "GEMINI_API_KEY:Google Gemini API key — get from https://aistudio.google.com/apikey"
  "GROQ_API_KEY:Groq API key — get from https://console.groq.com/keys"
  "SMSPOOL_API_KEY:SMSPool API key — get from https://smspool.net/profile"
  "API_SECRET:Any strong random string — used for internal API auth (generate with: openssl rand -hex 32)"
)

check_secrets() {
  local missing=()
  for entry in "${REQUIRED_SECRETS[@]}"; do
    key="${entry%%:*}"
    if [ -z "${!key}" ]; then
      missing+=("$entry")
    fi
  done

  if [ ${#missing[@]} -eq 0 ]; then
    echo "[secrets] ✓ All required secrets are set"
    return 0
  fi

  echo ""
  echo "╔══════════════════════════════════════════════════════════════════════╗"
  echo "║  ⚠️  MISSING SECRETS — app will not work until these are set        ║"
  echo "║  Set them in the Replit Secrets tab (🔒 in the left sidebar)        ║"
  echo "╠══════════════════════════════════════════════════════════════════════╣"
  for entry in "${missing[@]}"; do
    key="${entry%%:*}"
    desc="${entry#*:}"
    printf "║  %-20s  %s\n" "$key" "$desc"
  done
  echo "╚══════════════════════════════════════════════════════════════════════╝"
  echo ""
  return 1
}
