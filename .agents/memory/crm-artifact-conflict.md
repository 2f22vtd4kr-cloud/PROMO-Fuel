---
name: CRM artifact vs Mini App publishing
description: How to prevent artifacts/crm-platform from hijacking the Publishing UI
---

# CRM Artifact Classification

The CRM platform (`artifacts/crm-platform`) is a canvas design tool. It must never appear as "What you're publishing" in the Replit Publishing UI.

## The fix

The real registry is **`artifacts/crm-platform/.replit-artifact/artifact.toml`** — NOT the vite config.

Set `kind = "design"` (not `"web"`) and use a `/__` prefixed `previewPath`:

```toml
kind = "design"
previewPath = "/__crm/"
title = "CRM Canvas"
```

The `kind = "web"` value is what puts an artifact in the "What you're publishing" slot. `kind = "design"` classifies it as a canvas tool (like mockup-sandbox) and hides it from the publisher.

**Why:** Replit's artifact system injects `BASE_PATH` from `artifact.toml` at workflow start — so vite config defaults are overridden. Removing the cartographer plugin does NOT deregister the artifact server-side; only editing `artifact.toml` directly fixes it.

**How to apply:** If the CRM artifact ever reappears in Publishing, edit `.replit-artifact/artifact.toml` and set `kind = "design"`. The automatic_updates will confirm the reclassification immediately.

## Never do these (they don't work)
- Removing `@replit/vite-plugin-cartographer` from vite config — registration persists server-side
- Calling `deployConfig()` — only re-asserts run/build commands, doesn't affect artifact kind
- Changing `base:` in vite config — Replit injects `BASE_PATH` from artifact.toml, overriding it
