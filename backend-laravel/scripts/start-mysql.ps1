$ErrorActionPreference = "Stop"

$project = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $project

docker compose up -d mysql

Write-Host "MySQL corriendo en 127.0.0.1:3306"
