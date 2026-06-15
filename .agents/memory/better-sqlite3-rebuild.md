---
name: better-sqlite3 rebuild
description: How to rebuild better-sqlite3 native addon from scratch in this Nix/Replit environment.
---

## Two-step build (required every cold start if .node is missing)

```bash
# Step 1: compile sqlite3.c → sqlite3.o
BSQ="$(pwd)/node_modules/.pnpm/better-sqlite3@12.10.1/node_modules/better-sqlite3"
OUT="$BSQ/build/Release"
mkdir -p "$OUT"
gcc -O1 -fPIC -pthread -std=c99 -w -c "$BSQ/deps/sqlite3/sqlite3.c" -o "$OUT/sqlite3.o" \
  -DSQLITE_THREADSAFE=2 -DSQLITE_OMIT_SHARED_CACHE -DSQLITE_DEFAULT_MEMSTATUS=0 \
  -DSQLITE_OMIT_DEPRECATED -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_JSON1 \
  -DSQLITE_ENABLE_RTREE -DSQLITE_DEFAULT_FOREIGN_KEYS=1 -DNDEBUG

# Step 2: link addon
NODE_INC="/nix/store/jfar9wnj6kvr0gr6klh1gk7vgckkfr5j-nodejs-20.20.0/include/node"
g++ -O2 -fPIC -pthread -fno-rtti -fno-exceptions -std=gnu++20 -shared \
  -I"$NODE_INC" -I"$BSQ/deps/sqlite3" -I"$BSQ/src" \
  "$BSQ/src/better_sqlite3.cpp" "$OUT/sqlite3.o" \
  -o "$OUT/better_sqlite3.node"
```

## Why two steps
The linker can't find `sqlite3.o` unless it's built first separately. A single-pass compile+link fails with "No such file or directory" for the .o file.

## In post-merge.sh
`scripts/post-merge.sh` already contains this two-step rebuild so it runs automatically after any task merge.
