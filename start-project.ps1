$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = $root
$backend = Join-Path $root "backend-laravel"

$frontendListener = Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue
if (-not $frontendListener) {
  Start-Process -FilePath "C:\Program Files\nodejs\npm.cmd" `
    -ArgumentList @("run", "dev", "--", "--host=0.0.0.0", "--port=5173") `
    -WorkingDirectory $frontend `
    -WindowStyle Hidden
}

Set-Location $backend
docker compose up -d --build
docker compose exec app composer install

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  docker compose exec app php artisan key:generate
}

docker compose exec app php artisan migrate --seed

Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8000/api/health"
