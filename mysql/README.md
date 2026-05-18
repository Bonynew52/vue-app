# MySQL

Standalone MySQL 8.4 setup for the Laravel backend.

## Requirements

- Docker Desktop

## Start

```powershell
Copy-Item .env.example .env
docker compose up -d
```

## Connection

- Host from your machine: `127.0.0.1`
- Host from Docker Compose services: `mysql`
- Port: `3306`
- Database: `backend_laravel`
- User: `laravel`
- Password: `secret`
- Root password: `root`

The Laravel backend already includes its own `docker-compose.yml` with MySQL. Use this folder when you want the database as a separate service.
