# PROMO-Fuel — Session Handoff

_Rewritten each session. Contains only current state — no history._

---

## What was done this session

### 1. All 4 manuals updated to reflect recent changes

**ManualFactory.tsx** (now 18 slides):
- **Slide 7**: Updated from "7-Step Pipeline" → "8-Step Pipeline". Step 7 now = Profile Setup (AI Gemini name/bio/avatar or manual fields; avatar moved from pending_avatars/ to used_avatars/). Step 8 = Save & Add to CRM (was old Step 7).
- **Slide 9 (Batch Mode)**: Updated "up to 10 accounts" → "up to 20 accounts"; "1–10 accounts" → "1–20 accounts"; "7-step pipeline" → "8-step pipeline"; "7-step stepper" → "8-step stepper".
- **Slide 18 added**: "Max Attempts & Cost Estimator" — explains the `maxAttempts` field (1–999, default 20, orange glow when >20), cost estimator formula (maxAttempts × price × quantity), green card when within budget, red card with ⚠ when over budget.
- **SLIDES, TITLES_EN/UA, KEYWORDS_EN/UA arrays**: Updated to include Slide18 and corrected "7-Step Pipeline" → "8-Step Pipeline" in titles.

**Manual.tsx** (34 slides):
- **Cover slide**: Fixed "31 pages" → "34 pages" / "31 сторінка" → "34 сторінки".
- **SlideNewFeatures search text**: Fixed "33 slide titles" → "34 slides".
- **SlideNewFeatures**: Added new entry — "🎯 Max Attempts & Cost Estimator" feature.

**ManualAccounts.tsx** (12 slides):
- **Slide 4 (Bulk Import steps)**: Updated "tap the 📦 Bulk button in the top-right corner" → "tap ··· → 📦 Bulk Import" (reflects overflow menu).
- **Slide 9 (Scaling)**: Updated "Reset button in Accounts" → "«Reset Counts» in the ··· overflow menu"; updated "Bulk Proxy button in the toolbar" → "··· → 🌐 Bulk Proxy".

**ManualVerification.tsx**: No changes needed — fully up to date.

**App.tsx (ManualChooserPanel)**: Updated Factory guide page count 17 → 18.

---

## Current system state

- Typecheck passes clean after all manual edits.
- All workflows were NOT restarted this session (edits are content-only in TSX files; vite hot-reload handles it).

## Slide counts (current)

| Manual | Slides |
|---|---|
| Manual.tsx (Main guide) | 34 |
| ManualFactory.tsx | 18 |
| ManualAccounts.tsx | 12 |
| ManualVerification.tsx | 15 |

## Known issues / next steps

- ManualFactory Slide 12 (Warmup Modes) references "Step 8 (Save & Add to CRM)" which is now correct after the 8-step pipeline fix.
- mockup-sandbox canvas artifacts (PolishComplete.tsx, RefinedDepth.tsx, GroupsV2.tsx, WorkersV3.tsx, VideoTemplate.tsx) have known corrupted JSX — typecheck errors exist but do NOT affect the live app.
- No pending schema changes or dependency issues.
