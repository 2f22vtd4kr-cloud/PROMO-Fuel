---
name: Orval mixed-params collision
description: Orval generates colliding Params type names when an endpoint has both path and query params.
---

# Orval Mixed-Params Collision Rule

When an endpoint has BOTH a path parameter AND a query parameter, Orval generates a `{OperationId}Params` type in two places (zod and types/), causing a TypeScript collision error.

**Fix:** Remove query parameters from endpoints that already have path parameters. Move the responsibility to the server (use a hardcoded default or server config).

**Example:** `/campaigns/{id}/logs` with a `limit` query param → remove `limit`, hardcode `LIMIT 50` in SQL.

**Why:** Orval's naming convention: path-only endpoints generate `{Id}Params`, mixed endpoints collide. This is a known Orval limitation.

**How to apply:** Before adding a query param to any endpoint that has a path param, check if the functionality can be server-side defaulted instead.
