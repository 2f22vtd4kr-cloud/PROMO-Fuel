---
name: Liquid glass CSS system
description: 3-layer iOS 26-style glass material system used in the Telegram Mini App.
---

## The `.lg` class (main glass card)
Three pseudo-layers injected via `main.tsx` global `<style>`:
1. **Base** (`background`): multi-stop diagonal gradient at ~10% white opacity + `backdrop-filter: blur(44px) saturate(180%)`
2. **`::before`** — top specular highlight: 1px horizontal gradient `rgba(255,255,255,0.72)` at center
3. **`::after`** — prismatic color overlay: diagonal gradient mixing blue/pink/green/purple at 4-7% opacity

All direct children need `position: relative; z-index: 2` to appear above pseudo-layers.

## Other glass utilities
- `.lg-pill` — pill-shaped glass button, same layering but `border-radius: 100px`
- `.glass-card` — legacy alias kept for backward compat (simpler, no prismatic layer)
- `.lg-shine::before` — top-half inner specular (for icon wrappers)

## Navigation
`BottomNav.tsx`: 5 tabs — home, campaigns, analytics, audience, accounts.
Editor screen is a **full-screen overlay** (`position: absolute; inset: 0; z-index: 50`), not a nav tab.
Active tab shows: colored bubble bg + glowing icon + colored dot indicator.

## Haptics
`lib/haptics.ts` exports `haptic.light/medium/heavy/select/success/error/warning()`.
All interactive buttons call a haptic method. Pattern:
- Nav tap → `haptic.select()`
- CTA / save → `haptic.medium()`
- Success callback → `haptic.success()`
- Destructive → `haptic.warning()`

## Tab type
`export type Tab = "home" | "campaigns" | "analytics" | "audience" | "accounts"` in `App.tsx`.

**Why:** iOS 26 liquid glass aesthetic for premium Telegram Mini App feel. The 3-layer system is required because CSS `backdrop-filter` can't compose with pseudo-element blur independently — each layer serves a distinct optical role.
