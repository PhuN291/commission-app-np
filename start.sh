#!/bin/bash
cd /Users/mac/Desktop/sales-commission-tracker
export PATH="/Users/mac/local/bin:$PATH"
export NODE_ENV=development
export PORT=3001
node node_modules/.bin/tsx server/index.ts
