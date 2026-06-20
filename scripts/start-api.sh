#!/bin/bash
echo "Starting API server..."
exec node --enable-source-maps "$(pwd)/artifacts/api-server/dist/index.mjs"
