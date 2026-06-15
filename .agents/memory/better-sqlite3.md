---
name: better-sqlite3 pnpm approval
description: How to allow better-sqlite3 native build scripts in pnpm v10 workspace.
---

# better-sqlite3 Native Build Approval

pnpm v10 blocks build scripts by default. To allow better-sqlite3:

Add to root `package.json`:
```json
"pnpm": {
  "onlyBuiltDependencies": ["better-sqlite3", "esbuild", "thread-stream", "@replit/vite-plugin-cartographer", "@replit/vite-plugin-runtime-error-modal"]
}
```

Then run `pnpm install` followed by `pnpm --filter @workspace/api-server rebuild better-sqlite3`.

**Why:** `pnpm approve-builds` is interactive and can't be automated. The `onlyBuiltDependencies` field in package.json is the declarative alternative.

**How to apply:** Any time better-sqlite3 is installed in this workspace, add it to this list first or the native binary won't be compiled and imports will fail at runtime.
