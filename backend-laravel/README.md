# Backend Laravel

Backend preparado para Laravel y MySQL.

## Carpeta

```txt
backend-laravel/
  app/
  bootstrap/
  config/
  database/
  docker/
  public/
  routes/
  scripts/
  storage/
```

## Requisitos

- Docker Desktop
- Composer, solo si quieres correr Laravel fuera de Docker

## Arranque local

```powershell
cd "C:\Users\crist\OneDrive\Documentos\New project\backend-laravel"
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1
```

API de prueba:

```txt
http://localhost:8000/api/health
```

## Instalacion con Docker

```powershell
cd "C:\Users\crist\OneDrive\Documentos\New project\backend-laravel"
docker compose up -d --build
docker compose exec app composer install
docker compose exec app cp .env.example .env
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

Backend:

```txt
http://localhost:8000/api/health
```

MySQL:

```txt
host: 127.0.0.1
port: 3306
database: backend_laravel
user: laravel
password: secret
```

Si conectas desde tu maquina al MySQL de Docker, usa el puerto `3307`.

Tambien hay una configuracion independiente de MySQL en:

```txt
C:\Users\crist\OneDrive\Documentos\New project\mysql
```
