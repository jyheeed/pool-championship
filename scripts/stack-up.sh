#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo ".env file not found. Copy .env.example to .env before starting stack."
  exit 1
fi

docker compose up -d --build
echo "Stack started. Web: http://localhost:3000"
