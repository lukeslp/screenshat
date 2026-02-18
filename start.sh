#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=production
exec node dist/index.js
