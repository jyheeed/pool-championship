$ErrorActionPreference = 'Stop'

if (-not (Test-Path .env)) {
  Write-Host ".env file not found. Copy .env.example to .env before starting stack." -ForegroundColor Yellow
  exit 1
}

docker compose up -d --build
Write-Host "Stack started. Services: mongodb, web, vision-service" -ForegroundColor Green
Write-Host "Web: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Vision health: http://localhost:8010/health" -ForegroundColor Cyan
