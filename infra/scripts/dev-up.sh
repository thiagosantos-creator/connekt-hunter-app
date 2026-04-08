
#!/usr/bin/env sh
set -eu

docker compose -f infra/compose/docker-compose.dev.yml up --build
