#!/usr/bin/env sh
set -eu

npm install
npm run lint
npm run build
npm run test
