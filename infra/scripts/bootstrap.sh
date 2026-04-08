
#!/usr/bin/env sh
set -eu

corepack enable
pnpm install
pnpm run validate
