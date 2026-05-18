$ErrorActionPreference = "Stop"

$project = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $project

docker compose up -d --build
docker compose exec app composer install

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
}

docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed

Write-Host "Backend listo en http://localhost:8000"
